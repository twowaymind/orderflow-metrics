"""Online (streaming) estimators — O(1) per update, no rescans.

Batch metrics recompute over the whole history every time a tick arrives; that
is fine offline but wasteful in a live pipeline. The estimators here update in
constant time and constant memory as each observation streams in, which is what
you want feeding volatility or risk off a real-time tape.

They are numerically careful: ``Welford`` and ``RollingWindow`` use Welford's
and West's algorithms rather than the naive ``sum(x**2) - sum(x)**2 / n`` form,
which loses precision catastrophically when the mean is large relative to the
variance.

    Welford        - running mean & variance over all data seen so far
    Ewma           - exponentially weighted moving average (a level)
    EwmaVariance   - RiskMetrics-style EWMA variance (a volatility)
    RollingWindow  - mean & variance over a fixed trailing window

Sample variance uses the (n - 1) denominator; each class also exposes the
population (n) form. Variance properties are floored at 0 to absorb the tiny
negative values floating-point round-off can produce near zero.
"""
from __future__ import annotations

import math
from collections import deque


class Welford:
    """Streaming mean and variance over every value pushed so far (Welford's
    online algorithm). Constant time and memory per update, numerically stable
    regardless of the mean's magnitude.
    """

    __slots__ = ("_n", "_mean", "_m2")

    def __init__(self) -> None:
        self._n = 0
        self._mean = 0.0
        self._m2 = 0.0

    def push(self, x: float) -> None:
        """Incorporate one observation."""
        self._n += 1
        delta = x - self._mean
        self._mean += delta / self._n
        self._m2 += delta * (x - self._mean)

    @property
    def count(self) -> int:
        """Number of observations seen."""
        return self._n

    @property
    def mean(self) -> float:
        """Running mean (0 before any observation)."""
        return self._mean if self._n > 0 else 0.0

    @property
    def variance(self) -> float:
        """Sample variance, (n - 1) denominator (0 for fewer than two obs)."""
        if self._n < 2:
            return 0.0
        v = self._m2 / (self._n - 1)
        return v if v > 0 else 0.0

    @property
    def population_variance(self) -> float:
        """Population variance, n denominator (0 before any observation)."""
        if self._n < 1:
            return 0.0
        v = self._m2 / self._n
        return v if v > 0 else 0.0

    @property
    def std(self) -> float:
        """Sample standard deviation."""
        return math.sqrt(self.variance)


class Ewma:
    """Exponentially weighted moving average of a level:
    ``v_t = lambda * v_{t-1} + (1 - lambda) * x_t``.

    ``lambda_`` is the weight on history (decay), in (0, 1) - larger is smoother
    and slower to react. Seeded with the first value pushed.
    """

    __slots__ = ("_lambda", "_value", "_init")

    def __init__(self, lambda_: float) -> None:
        if not 0.0 < lambda_ < 1.0:
            raise ValueError("lambda_ must be in the open interval (0, 1)")
        self._lambda = lambda_
        self._value = 0.0
        self._init = False

    def push(self, x: float) -> None:
        """Incorporate one observation."""
        self._value = (
            self._lambda * self._value + (1 - self._lambda) * x if self._init else x
        )
        self._init = True

    @property
    def value(self) -> float:
        """Current EWMA level (0 before any observation)."""
        return self._value

    @property
    def initialized(self) -> bool:
        """Whether at least one value has been pushed."""
        return self._init


class EwmaVariance:
    """RiskMetrics-style exponentially weighted variance of a return series:
    ``sigma2_t = lambda * sigma2_{t-1} + (1 - lambda) * r_t**2``.

    Assumes approximately zero-mean returns (the standard RiskMetrics
    assumption). ``lambda_`` in (0, 1) is the decay; RiskMetrics uses 0.94 for
    daily data. Seeded with ``r**2`` of the first value pushed.
    """

    __slots__ = ("_lambda", "_var", "_init")

    def __init__(self, lambda_: float) -> None:
        if not 0.0 < lambda_ < 1.0:
            raise ValueError("lambda_ must be in the open interval (0, 1)")
        self._lambda = lambda_
        self._var = 0.0
        self._init = False

    def push(self, r: float) -> None:
        """Incorporate one return."""
        self._var = (
            self._lambda * self._var + (1 - self._lambda) * r * r if self._init else r * r
        )
        self._init = True

    @property
    def variance(self) -> float:
        """Current EWMA variance (0 before any observation)."""
        return self._var

    @property
    def std(self) -> float:
        """Current EWMA volatility (standard deviation)."""
        return math.sqrt(self._var)

    @property
    def initialized(self) -> bool:
        """Whether at least one value has been pushed."""
        return self._init


class RollingWindow:
    """Mean and variance over a fixed trailing window of the last ``size``
    values. Each push is O(1): the incoming value is added and, once the window
    is full, the oldest is removed, both via West's (1979) incremental update -
    so there is no per-tick rescan and no ``sum(x**2)`` cancellation.
    """

    __slots__ = ("_size", "_buf", "_mean", "_m2")

    def __init__(self, size: int) -> None:
        if not isinstance(size, int) or size < 1:
            raise ValueError("size must be a positive integer")
        self._size = size
        self._buf: deque[float] = deque()
        self._mean = 0.0
        self._m2 = 0.0

    def push(self, x: float) -> None:
        """Push one value, evicting the oldest once the window is full."""
        if len(self._buf) < self._size:
            # Window not yet full: plain Welford add.
            n = len(self._buf) + 1
            delta = x - self._mean
            self._mean += delta / n
            self._m2 += delta * (x - self._mean)
            self._buf.append(x)
            return
        # Full: add the newcomer, then remove the oldest (West's add + remove).
        old = self._buf[0]
        n1 = self._size + 1
        delta = x - self._mean
        mean1 = self._mean + delta / n1
        m2_added = self._m2 + delta * (x - mean1)
        mean0 = (n1 * mean1 - old) / self._size
        self._m2 = m2_added - (old - mean0) * (old - mean1)
        self._mean = mean0
        self._buf.popleft()
        self._buf.append(x)

    @property
    def size(self) -> int:
        """Configured window size."""
        return self._size

    @property
    def count(self) -> int:
        """Number of values currently in the window (<= size)."""
        return len(self._buf)

    @property
    def full(self) -> bool:
        """Whether the window has filled to ``size``."""
        return len(self._buf) == self._size

    @property
    def mean(self) -> float:
        """Mean of the current window (0 when empty)."""
        return self._mean if self._buf else 0.0

    @property
    def variance(self) -> float:
        """Sample variance of the current window (0 for fewer than two values)."""
        n = len(self._buf)
        if n < 2:
            return 0.0
        v = self._m2 / (n - 1)
        return v if v > 0 else 0.0

    @property
    def population_variance(self) -> float:
        """Population variance of the current window (0 when empty)."""
        n = len(self._buf)
        if n < 1:
            return 0.0
        v = self._m2 / n
        return v if v > 0 else 0.0

    @property
    def std(self) -> float:
        """Sample standard deviation of the current window."""
        return math.sqrt(self.variance)
