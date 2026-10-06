"""
InsightFlow — Demand Forecasting Engine

Predicts future request intake volume using historical day-of-week
pattern analysis. Fully deterministic — no ML libraries required.

Methodology:
  1. Compute per-day-of-week average from historical data
  2. Apply a 3-point rolling smoothing to reduce noise
  3. Blend with recent trend momentum (last 7 days vs prior 7 days)
  4. Produce a 7-day or 14-day forward forecast with confidence bands

Output per day:
  - date: str (YYYY-MM-DD)
  - day_name: str ('Monday', etc.)
  - predicted_count: int
  - confidence_band_low: int
  - confidence_band_high: int
  - confidence_pct: int
  - day_type: 'historical' | 'forecast'
"""
from datetime import timedelta, date
import math
from django.utils import timezone
from django.db.models import Count
from django.db.models.functions import TruncDate


class DemandForecastEngine:
    """
    Generates a deterministic N-day demand forecast for institutional service requests.
    """

    DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    @classmethod
    def generate_forecast(cls, forecast_days: int = 7, history_days: int = 60) -> dict:
        """
        Generate demand forecast.

        Args:
            forecast_days: Number of future days to forecast (default: 7)
            history_days: Historical window to analyze (default: 60 days)

        Returns:
            dict with 'historical', 'forecast', 'summary', and 'insights' keys
        """
        from apps.requests.models import ServiceRequest

        since = timezone.now() - timedelta(days=history_days)

        # Fetch historical daily counts
        daily_data = list(
            ServiceRequest.objects
            .filter(created_at__gte=since)
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )

        # Build lookup: {date: count}
        hist_map = {str(row['date']): row['count'] for row in daily_data}

        # ── Step 1: Compute day-of-week averages ──────────────────────────────
        dow_totals = [0] * 7  # Mon=0 ... Sun=6
        dow_counts = [0] * 7

        current = since.date()
        today = timezone.now().date()
        while current <= today:
            count = hist_map.get(str(current), 0)
            dow = current.weekday()
            dow_totals[dow] += count
            dow_counts[dow] += 1
            current += timedelta(days=1)

        dow_avg = [
            dow_totals[i] / max(1, dow_counts[i])
            for i in range(7)
        ]

        # ── Step 2: Compute recent momentum ──────────────────────────────────
        recent_week = sum(
            hist_map.get(str(today - timedelta(days=i)), 0)
            for i in range(1, 8)
        )
        prior_week = sum(
            hist_map.get(str(today - timedelta(days=i)), 0)
            for i in range(8, 15)
        )

        # Growth ratio (capped to ±30%)
        if prior_week > 0:
            momentum = min(1.30, max(0.70, recent_week / prior_week))
        else:
            momentum = 1.0

        # ── Step 3: Historical data (last 14 days for chart context) ─────────
        historical = []
        for i in range(14, 0, -1):
            d = today - timedelta(days=i)
            count = hist_map.get(str(d), 0)
            historical.append({
                'date': str(d),
                'day_name': cls.DAY_NAMES[d.weekday()],
                'count': count,
                'day_type': 'historical',
            })

        # ── Step 4: Generate forward forecast ────────────────────────────────
        forecast = []
        overall_std = cls._compute_std(list(hist_map.values()))

        for i in range(1, forecast_days + 1):
            future_date = today + timedelta(days=i)
            dow = future_date.weekday()

            # Base prediction from dow_avg * momentum
            raw_pred = dow_avg[dow] * momentum

            # Smooth with ±1 day DOW neighbors for stability
            left = dow_avg[(dow - 1) % 7]
            right = dow_avg[(dow + 1) % 7]
            smoothed = raw_pred * 0.7 + left * 0.15 + right * 0.15

            predicted = max(0, round(smoothed))

            # Confidence band: ±1σ
            std = overall_std if overall_std > 0 else max(1, smoothed * 0.25)
            low = max(0, round(predicted - std))
            high = round(predicted + std)

            # Confidence decreases as we go further out
            confidence = max(60, 92 - (i - 1) * 4)

            # Flag weekends
            is_weekend = dow >= 5

            forecast.append({
                'date': str(future_date),
                'day_name': cls.DAY_NAMES[dow],
                'predicted_count': predicted,
                'confidence_band_low': low,
                'confidence_band_high': high,
                'confidence_pct': confidence,
                'is_weekend': is_weekend,
                'day_type': 'forecast',
            })

        # ── Step 5: Summary insights ──────────────────────────────────────────
        total_forecasted = sum(f['predicted_count'] for f in forecast)
        peak_day = max(forecast, key=lambda x: x['predicted_count'])
        quiet_day = min(forecast, key=lambda x: x['predicted_count'])

        trend_direction = 'increasing' if momentum > 1.05 else 'decreasing' if momentum < 0.95 else 'stable'

        insights = []

        # Peak day insight
        insights.append({
            'type': 'peak_alert',
            'icon': '📈',
            'title': f'Peak Day Expected: {peak_day["day_name"]} ({peak_day["date"]})',
            'description': (
                f'Forecast shows {peak_day["predicted_count"]} requests on '
                f'{peak_day["day_name"]} — the busiest day of the forecast period. '
                f'Ensure adequate staff coverage.'
            ),
        })

        # Trend insight
        insights.append({
            'type': 'trend',
            'icon': '📊',
            'title': f'Demand Trend: {trend_direction.title()}',
            'description': (
                f'Recent 7-day volume ({recent_week}) vs prior 7 days ({prior_week}) '
                f'indicates a {trend_direction} trend. '
                f'Momentum factor: {round(momentum, 2)}×.'
            ),
        })

        if is_weekend:
            insights.append({
                'type': 'weekend_notice',
                'icon': '🗓️',
                'title': 'Weekend Effect Modeled',
                'description': (
                    'Weekend days historically receive fewer submissions. '
                    'Forecast accounts for day-of-week patterns automatically.'
                ),
            })

        return {
            'historical': historical,
            'forecast': forecast,
            'summary': {
                'forecast_days': forecast_days,
                'history_days': history_days,
                'total_forecasted_volume': total_forecasted,
                'peak_day': peak_day,
                'quiet_day': quiet_day,
                'trend_direction': trend_direction,
                'momentum_factor': round(momentum, 2),
                'avg_daily_historical': round(sum(list(hist_map.values())) / max(1, len(hist_map)), 1),
            },
            'insights': insights,
        }

    @staticmethod
    def _compute_std(values: list) -> float:
        """Compute standard deviation of a list of values."""
        if len(values) < 2:
            return 0.0
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        return math.sqrt(variance)
