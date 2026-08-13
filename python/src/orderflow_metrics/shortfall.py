"""Implementation shortfall and arrival slippage.

Perold's (1988) "implementation shortfall" measures the all-in cost of turning a
paper decision into real fills. It splits into the cost paid on the shares you
actually executed (vs the price when you decided), the opportunity cost of the
shares you failed to execute as the price drifted away, and fees. Arrival
slippage is the simpler, per-order version against the arrival mid.

Sign convention: buys are +1, sells are -1. All costs are returned as
*positive = worse* (a shortfall), in the input price/quantity units.
"""
from __future__ import annotations

from dataclasses import dataclass

from .types import Side


def _dir(side: Side) -> int:
    return 1 if side == "buy" else -1


@dataclass(frozen=True)
class ShortfallResult:
    """Implementation shortfall decomposed into its components."""

    execution: float
    opportunity: float
    fees: float
    total: float


def implementation_shortfall(
    side: Side,
    decision_price: float,
    avg_exec_price: float,
    executed_qty: float,
    target_qty: float,
    final_price: float,
    fees: float = 0.0,
) -> ShortfallResult:
    """Implementation shortfall of an order (execution + opportunity + fees).

    ``decision_price`` is the paper benchmark, ``avg_exec_price`` the VWAP
    actually achieved, ``executed_qty`` / ``target_qty`` the filled and intended
    sizes, and ``final_price`` prices the unfilled remainder. Positive = cost.
    """
    d = _dir(side)
    execution = d * (avg_exec_price - decision_price) * executed_qty
    unexecuted = max(0.0, target_qty - executed_qty)
    opportunity = d * (final_price - decision_price) * unexecuted
    return ShortfallResult(
        execution=execution,
        opportunity=opportunity,
        fees=fees,
        total=execution + opportunity + fees,
    )


def arrival_slippage_bps(
    side: Side,
    arrival_price: float,
    avg_exec_price: float,
) -> float:
    """Arrival slippage in basis points, signed by side.

    Positive = adverse (paid up on a buy / sold low on a sell). Returns 0 when
    the arrival price is 0.
    """
    if arrival_price == 0:
        return 0.0
    return (_dir(side) * (avg_exec_price - arrival_price) / arrival_price) * 10_000
