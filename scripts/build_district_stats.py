#!/usr/bin/env python3
"""Builds election-district stats for Gangseo-gu Na district (Hwagok 3-dong + Balsan 1-dong)."""

from __future__ import annotations

import csv
import json
import math
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Tuple
from urllib.parse import urlencode
from urllib.request import Request, urlopen

POP_URL = "https://jumin.mois.go.kr/downloadCsv.do?searchYearMonth=month&xlsStats=3"
AGE_URL = "https://jumin.mois.go.kr/downloadCsvAge.do?searchYearMonth=month&xlsStats=3"

AGE_BANDS_5Y = [
    "0~4세",
    "5~9세",
    "10~14세",
    "15~19세",
    "20~24세",
    "25~29세",
    "30~34세",
    "35~39세",
    "40~44세",
    "45~49세",
    "50~54세",
    "55~59세",
    "60~64세",
    "65~69세",
    "70~74세",
    "75~79세",
    "80~84세",
    "85~89세",
    "90~94세",
    "95~99세",
    "100세 이상",
]

AGE_MIDPOINTS = {
    "0~4세": 2,
    "5~9세": 7,
    "10~14세": 12,
    "15~19세": 17,
    "20~24세": 22,
    "25~29세": 27,
    "30~34세": 32,
    "35~39세": 37,
    "40~44세": 42,
    "45~49세": 47,
    "50~54세": 52,
    "55~59세": 57,
    "60~64세": 62,
    "65~69세": 67,
    "70~74세": 72,
    "75~79세": 77,
    "80~84세": 82,
    "85~89세": 87,
    "90~94세": 92,
    "95~99세": 97,
    "100세 이상": 102,
}

TARGETS = {
    "hwagok3": {
        "name": "화곡3동",
        "mois_name": "화곡제3동",
        "code": "1150056000",
        "geojson_path": "data/hwagok3.geojson",
    },
    "balsan1": {
        "name": "발산1동",
        "mois_name": "발산제1동",
        "code": "1150061100",
        "geojson_path": "data/balsan1.geojson",
    },
}

GANGSEO_CODE = "1150000000"


@dataclass(frozen=True)
class YearMonth:
    year: int
    month: int

    @property
    def label(self) -> str:
        return f"{self.year}년{self.month:02d}월"

    @property
    def key(self) -> str:
        return f"{self.year:04d}-{self.month:02d}"


def ym_to_index(ym: YearMonth) -> int:
    return ym.year * 12 + (ym.month - 1)


def index_to_ym(index: int) -> YearMonth:
    return YearMonth(year=index // 12, month=(index % 12) + 1)


def add_months(ym: YearMonth, diff: int) -> YearMonth:
    return index_to_ym(ym_to_index(ym) + diff)


def parse_int(value: str) -> int:
    text = (value or "").replace(",", "").strip()
    return int(text) if text else 0


def parse_float(value: str) -> float:
    text = (value or "").replace(",", "").strip()
    return float(text) if text else 0.0


def safe_div(numerator: float, denominator: float) -> float:
    return numerator / denominator if denominator else 0.0


def round2(value: float) -> float:
    return round(value + 1e-10, 2)


def round3(value: float) -> float:
    return round(value + 1e-10, 3)


def format_signed(value: int) -> str:
    if value > 0:
        return f"+{value:,}"
    return f"{value:,}"


def parse_code(region_cell: str) -> str:
    match = re.search(r"\((\d{10})\)\s*$", region_cell or "")
    if not match:
        return ""
    return match.group(1)


def request_csv(url: str, params: Dict[str, str]) -> str:
    data = urlencode(params).encode("utf-8")
    req = Request(
        url,
        data=data,
        method="POST",
        headers={
            "User-Agent": "CodexDistrictStats/1.0",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    with urlopen(req, timeout=45) as resp:
        payload = resp.read()

    if len(payload) < 100:
        return ""

    for enc in ("cp949", "euc-kr", "utf-8"):
        try:
            return payload.decode(enc)
        except UnicodeDecodeError:
            continue
    return payload.decode("utf-8", errors="replace")


def parse_rows(csv_text: str) -> List[Dict[str, str]]:
    lines = csv_text.splitlines()
    if not lines:
        return []
    return list(csv.DictReader(lines))


def pop_params(ym: YearMonth) -> Dict[str, str]:
    mm = f"{ym.month:02d}"
    return {
        "sltOrgType": "1",
        "sltOrgLvl1": "A",
        "sltOrgLvl2": "",
        "gender": "gender",
        "genderPer": "genderPer",
        "generation": "generation",
        "sltUndefType": "",
        "searchYearStart": str(ym.year),
        "searchMonthStart": mm,
        "searchYearEnd": str(ym.year),
        "searchMonthEnd": mm,
        "sltOrderType": "1",
        "sltOrderValue": "ASC",
        "category": "month",
    }


def age_params(ym: YearMonth) -> Dict[str, str]:
    mm = f"{ym.month:02d}"
    return {
        "sltOrgType": "1",
        "sltOrgLvl1": "A",
        "sltOrgLvl2": "",
        "gender": "gender",
        "sum": "sum",
        "sltUndefType": "",
        "searchYearStart": str(ym.year),
        "searchMonthStart": mm,
        "searchYearEnd": str(ym.year),
        "searchMonthEnd": mm,
        "sltOrderType": "1",
        "sltOrderValue": "ASC",
        "sltArgTypes": "5",
        "sltArgTypeA": "0",
        "sltArgTypeB": "100",
        "category": "month",
    }


def find_latest_available_month(start_year: int | None = None, end_year: int = 2008) -> YearMonth:
    now = datetime.now()
    max_year = now.year if start_year is None else min(now.year, start_year)

    for year in range(max_year, end_year - 1, -1):
        last_month = now.month if year == now.year else 12
        for month in range(last_month, 0, -1):
            ym = YearMonth(year, month)
            text = request_csv(POP_URL, pop_params(ym))
            if "행정구역" in text and "총인구수" in text:
                return ym

    raise RuntimeError("No available MOIS month found.")


def rows_by_code(rows: Iterable[Dict[str, str]]) -> Dict[str, Dict[str, str]]:
    mapped: Dict[str, Dict[str, str]] = {}
    for row in rows:
        code = parse_code(row.get("행정구역", ""))
        if code:
            mapped[code] = row
    return mapped


def ring_area_on_sphere(ring: List[List[float]]) -> float:
    if not ring:
        return 0.0

    if ring[0] != ring[-1]:
        ring = ring + [ring[0]]

    radius = 6_378_137.0
    total = 0.0
    for i in range(len(ring) - 1):
        lon1, lat1 = ring[i]
        lon2, lat2 = ring[i + 1]
        lon1r, lon2r = math.radians(lon1), math.radians(lon2)
        lat1r, lat2r = math.radians(lat1), math.radians(lat2)
        total += (lon2r - lon1r) * (2.0 + math.sin(lat1r) + math.sin(lat2r))

    return abs(total) * (radius * radius) / 2.0


def polygon_area_m2(geojson: Dict) -> float:
    gtype = geojson.get("type")
    coords = geojson.get("coordinates", [])

    if gtype == "Polygon":
        if not coords:
            return 0.0
        outer = ring_area_on_sphere(coords[0])
        holes = sum(ring_area_on_sphere(ring) for ring in coords[1:])
        return max(0.0, outer - holes)

    if gtype == "MultiPolygon":
        total = 0.0
        for polygon in coords:
            if not polygon:
                continue
            outer = ring_area_on_sphere(polygon[0])
            holes = sum(ring_area_on_sphere(ring) for ring in polygon[1:])
            total += max(0.0, outer - holes)
        return total

    return 0.0


def area_km2_from_file(base_dir: Path, rel_path: str) -> float:
    geojson = json.loads((base_dir / rel_path).read_text(encoding="utf-8"))
    return round3(polygon_area_m2(geojson) / 1_000_000.0)


def age_counts(row: Dict[str, str], ym: YearMonth, prefix: str = "계") -> Dict[str, int]:
    label = ym.label
    result: Dict[str, int] = {}
    for band in AGE_BANDS_5Y:
        key = f"{label}_{prefix}_{band}"
        result[band] = parse_int(row.get(key, "0"))
    return result


def sum_bands(counts: Dict[str, int], bands: List[str]) -> int:
    return sum(counts.get(b, 0) for b in bands)


def approx_average_age(counts: Dict[str, int], total: int) -> float:
    if total <= 0:
        return 0.0
    weighted = sum(counts.get(band, 0) * AGE_MIDPOINTS[band] for band in AGE_BANDS_5Y)
    return weighted / total


def approx_median_age(counts: Dict[str, int], total: int) -> float:
    if total <= 0:
        return 0.0

    half = total / 2.0
    cumulative = 0
    for band in AGE_BANDS_5Y:
        c = counts.get(band, 0)
        prev = cumulative
        cumulative += c
        if cumulative >= half and c > 0:
            if band == "100세 이상":
                return 100.0
            start = int(band.split("~", 1)[0])
            width = 5
            ratio = (half - prev) / c
            return start + (ratio * width)

    return 100.0


def top_age_band(counts: Dict[str, int]) -> Tuple[str, int]:
    band = max(AGE_BANDS_5Y, key=lambda b: counts.get(b, 0))
    return band, counts.get(band, 0)


def region_metrics(pop_row: Dict[str, str], age_row: Dict[str, str], ym: YearMonth, area_km2: float) -> Dict:
    label = ym.label

    total_pop = parse_int(pop_row[f"{label}_총인구수"])
    households = parse_int(pop_row[f"{label}_세대수"])
    avg_household = parse_float(pop_row[f"{label}_세대당 인구"])
    male = parse_int(pop_row[f"{label}_남자 인구수"])
    female = parse_int(pop_row[f"{label}_여자 인구수"])
    male_female_ratio = parse_float(pop_row[f"{label}_남여 비율"])

    counts = age_counts(age_row, ym, prefix="계")

    children_0_14 = sum_bands(counts, ["0~4세", "5~9세", "10~14세"])
    teen_15_19 = counts["15~19세"]
    young_20_39 = sum_bands(counts, ["20~24세", "25~29세", "30~34세", "35~39세"])
    middle_40_64 = sum_bands(counts, ["40~44세", "45~49세", "50~54세", "55~59세", "60~64세"])
    working_15_64 = teen_15_19 + young_20_39 + middle_40_64
    senior_65_plus = sum_bands(
        counts,
        ["65~69세", "70~74세", "75~79세", "80~84세", "85~89세", "90~94세", "95~99세", "100세 이상"],
    )

    avg_age = approx_average_age(counts, total_pop)
    median_age = approx_median_age(counts, total_pop)
    max_band, max_band_count = top_age_band(counts)

    return {
        "population": total_pop,
        "households": households,
        "avg_household_size": round2(avg_household),
        "male": male,
        "female": female,
        "male_per_female": round2(male_female_ratio),
        "male_ratio_percent": round2(safe_div(male * 100.0, total_pop)),
        "female_ratio_percent": round2(safe_div(female * 100.0, total_pop)),
        "area_km2": round3(area_km2),
        "population_density_per_km2": round2(safe_div(total_pop, area_km2)),
        "age_bands_5y": {band: counts.get(band, 0) for band in AGE_BANDS_5Y},
        "age_summary": {
            "children_0_14": children_0_14,
            "teen_15_19": teen_15_19,
            "young_20_39": young_20_39,
            "middle_40_64": middle_40_64,
            "working_15_64": working_15_64,
            "senior_65_plus": senior_65_plus,
            "children_ratio_percent": round2(safe_div(children_0_14 * 100.0, total_pop)),
            "working_ratio_percent": round2(safe_div(working_15_64 * 100.0, total_pop)),
            "senior_ratio_percent": round2(safe_div(senior_65_plus * 100.0, total_pop)),
            "aging_index": round2(safe_div(senior_65_plus * 100.0, children_0_14)),
            "dependency_ratio": round2(safe_div((children_0_14 + senior_65_plus) * 100.0, working_15_64)),
            "average_age_est": round2(avg_age),
            "median_age_est": round2(median_age),
            "largest_age_band": max_band,
            "largest_age_band_count": max_band_count,
            "largest_age_band_ratio_percent": round2(safe_div(max_band_count * 100.0, total_pop)),
        },
    }


def strip_mois_name(region_cell: str) -> str:
    text = re.sub(r"\(\d{10}\)\s*$", "", region_cell).strip()
    text = text.replace("서울특별시 강서구 ", "")
    text = text.replace("서울특별시 강서구", "강서구")
    return text


def trend_labels(ym: YearMonth, months: int = 12) -> List[YearMonth]:
    latest_index = ym_to_index(ym)
    return [index_to_ym(i) for i in range(latest_index - months + 1, latest_index + 1)]


def main() -> None:
    project_dir = Path(__file__).resolve().parent.parent
    data_dir = project_dir / "data"

    latest = find_latest_available_month()

    pop_cache: Dict[str, Dict[str, Dict[str, str]]] = {}

    def load_pop_map(ym: YearMonth) -> Dict[str, Dict[str, str]]:
        key = ym.key
        if key not in pop_cache:
            csv_text = request_csv(POP_URL, pop_params(ym))
            rows = parse_rows(csv_text)
            pop_cache[key] = rows_by_code(rows)
        return pop_cache[key]

    current_pop_map = load_pop_map(latest)

    # age table (5-year bands) for latest month
    age_text_latest = request_csv(AGE_URL, age_params(latest))
    age_rows_latest = rows_by_code(parse_rows(age_text_latest))

    previous_month = add_months(latest, -1)
    previous_year_same_month = add_months(latest, -12)

    prev_pop_map = load_pop_map(previous_month)
    yoy_pop_map = load_pop_map(previous_year_same_month)

    # strong assumption for district: 화곡3동 + 발산1동
    areas: Dict[str, float] = {}
    for key, info in TARGETS.items():
        areas[key] = area_km2_from_file(project_dir, info["geojson_path"])
    gangseo_area_km2 = area_km2_from_file(project_dir, "data/gangseo.geojson")

    # Gangseo dong ranking within latest month
    latest_rows_all = list(load_pop_map(latest).values())
    gangseo_dong_rows = []
    for row in latest_rows_all:
        region_cell = row.get("행정구역", "")
        code = parse_code(region_cell)
        if not code or code == GANGSEO_CODE:
            continue
        if region_cell.startswith("서울특별시 강서구 "):
            gangseo_dong_rows.append(row)

    label = latest.label
    gangseo_dong_rows.sort(key=lambda r: parse_int(r[f"{label}_총인구수"]), reverse=True)
    population_rank = {
        parse_code(r["행정구역"]): idx + 1 for idx, r in enumerate(gangseo_dong_rows)
    }

    gangseo_dong_rows_house = sorted(
        gangseo_dong_rows, key=lambda r: parse_int(r[f"{label}_세대수"]), reverse=True
    )
    household_rank = {
        parse_code(r["행정구역"]): idx + 1 for idx, r in enumerate(gangseo_dong_rows_house)
    }

    regions: Dict[str, Dict] = {}
    prev_label = previous_month.label
    yoy_label = previous_year_same_month.label

    for key, info in TARGETS.items():
        code = info["code"]
        pop_row = current_pop_map[code]
        age_row = age_rows_latest[code]

        region = region_metrics(pop_row, age_row, latest, areas[key])

        # Change values
        curr_pop = region["population"]
        prev_pop = parse_int(prev_pop_map[code][f"{prev_label}_총인구수"]) if code in prev_pop_map else 0
        yoy_pop = parse_int(yoy_pop_map[code][f"{yoy_label}_총인구수"]) if code in yoy_pop_map else 0

        region["change"] = {
            "mom_population": curr_pop - prev_pop,
            "mom_population_rate_percent": round2(safe_div((curr_pop - prev_pop) * 100.0, prev_pop)),
            "yoy_population": curr_pop - yoy_pop,
            "yoy_population_rate_percent": round2(safe_div((curr_pop - yoy_pop) * 100.0, yoy_pop)),
        }

        region["rank_in_gangseo"] = {
            "population": population_rank.get(code, 0),
            "households": household_rank.get(code, 0),
            "total_dongs": len(gangseo_dong_rows),
        }

        regions[key] = {
            "id": key,
            "name": info["name"],
            "mois_name": info["mois_name"],
            "code": code,
            "metrics": region,
        }

    # Gangseo metrics
    gangseo_pop_row = current_pop_map[GANGSEO_CODE]
    gangseo_age_row = age_rows_latest[GANGSEO_CODE]

    gangseo_metrics = region_metrics(
        gangseo_pop_row,
        gangseo_age_row,
        latest,
        area_km2=gangseo_area_km2,
    )

    gangseo_curr = gangseo_metrics["population"]
    gangseo_prev = parse_int(prev_pop_map[GANGSEO_CODE][f"{prev_label}_총인구수"])
    gangseo_yoy = parse_int(yoy_pop_map[GANGSEO_CODE][f"{yoy_label}_총인구수"])
    gangseo_metrics["change"] = {
        "mom_population": gangseo_curr - gangseo_prev,
        "mom_population_rate_percent": round2(safe_div((gangseo_curr - gangseo_prev) * 100.0, gangseo_prev)),
        "yoy_population": gangseo_curr - gangseo_yoy,
        "yoy_population_rate_percent": round2(safe_div((gangseo_curr - gangseo_yoy) * 100.0, gangseo_yoy)),
    }

    # District aggregate (sum of two dongs)
    district_population = sum(regions[k]["metrics"]["population"] for k in TARGETS)
    district_households = sum(regions[k]["metrics"]["households"] for k in TARGETS)
    district_male = sum(regions[k]["metrics"]["male"] for k in TARGETS)
    district_female = sum(regions[k]["metrics"]["female"] for k in TARGETS)
    district_area = sum(regions[k]["metrics"]["area_km2"] for k in TARGETS)

    district_age_counts = {band: 0 for band in AGE_BANDS_5Y}
    for band in AGE_BANDS_5Y:
        district_age_counts[band] = sum(
            regions[k]["metrics"]["age_bands_5y"][band] for k in TARGETS
        )

    district_pop_row = {
        f"{label}_총인구수": str(district_population),
        f"{label}_세대수": str(district_households),
        f"{label}_세대당 인구": str(safe_div(district_population, district_households)),
        f"{label}_남자 인구수": str(district_male),
        f"{label}_여자 인구수": str(district_female),
        f"{label}_남여 비율": str(safe_div(district_male, district_female)),
    }
    district_age_row = {f"{label}_계_{band}": str(v) for band, v in district_age_counts.items()}

    district_metrics = region_metrics(district_pop_row, district_age_row, latest, district_area)

    prev_district = sum(parse_int(prev_pop_map[TARGETS[k]["code"]][f"{prev_label}_총인구수"]) for k in TARGETS)
    yoy_district = sum(parse_int(yoy_pop_map[TARGETS[k]["code"]][f"{yoy_label}_총인구수"]) for k in TARGETS)
    district_metrics["change"] = {
        "mom_population": district_population - prev_district,
        "mom_population_rate_percent": round2(
            safe_div((district_population - prev_district) * 100.0, prev_district)
        ),
        "yoy_population": district_population - yoy_district,
        "yoy_population_rate_percent": round2(
            safe_div((district_population - yoy_district) * 100.0, yoy_district)
        ),
    }
    district_metrics["share_of_gangseo_percent"] = round2(
        safe_div(district_population * 100.0, gangseo_curr)
    )

    # 12-month trend
    months = trend_labels(latest, months=12)
    trend = {
        "labels": [m.key for m in months],
        "district_population": [],
        "hwagok3_population": [],
        "balsan1_population": [],
        "gangseo_population": [],
    }

    for ym in months:
        pmap = load_pop_map(ym)
        month_label = ym.label

        hw = parse_int(pmap[TARGETS["hwagok3"]["code"]][f"{month_label}_총인구수"])
        ba = parse_int(pmap[TARGETS["balsan1"]["code"]][f"{month_label}_총인구수"])
        ga = parse_int(pmap[GANGSEO_CODE][f"{month_label}_총인구수"])

        trend["hwagok3_population"].append(hw)
        trend["balsan1_population"].append(ba)
        trend["district_population"].append(hw + ba)
        trend["gangseo_population"].append(ga)

    # ranking snapshot for all Gangseo dongs
    gangseo_rank_table = []
    for idx, row in enumerate(gangseo_dong_rows, start=1):
        code = parse_code(row["행정구역"])
        if not code:
            continue
        gangseo_rank_table.append(
            {
                "rank": idx,
                "code": code,
                "name": strip_mois_name(row["행정구역"]),
                "population": parse_int(row[f"{label}_총인구수"]),
                "households": parse_int(row[f"{label}_세대수"]),
            }
        )

    result = {
        "metadata": {
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "latest_month": latest.key,
            "latest_month_label": latest.label,
            "latest_month_absolute_date": f"{latest.year}-{latest.month:02d}-01",
            "source_scope": "행정안전부 주민등록인구통계(외국인 제외, 거주자·거주불명자·재외국민 포함)",
            "sources": [
                {
                    "name": "행정안전부 주민등록 인구통계 - 행정동별 주민등록 인구 및 세대현황",
                    "url": "https://jumin.mois.go.kr/statMonth.do",
                },
                {
                    "name": "행정안전부 주민등록 인구통계 - 행정동별 연령별 인구현황",
                    "url": "https://jumin.mois.go.kr/ageStatMonth.do",
                },
                {
                    "name": "OpenStreetMap Nominatim 경계 데이터 (화곡3동, 발산1동)",
                    "url": "https://nominatim.openstreetmap.org/",
                },
            ],
        },
        "district": {
            "name": "서울 강서구 나선거구",
            "dongs": [TARGETS["hwagok3"]["name"], TARGETS["balsan1"]["name"]],
            "metrics": district_metrics,
        },
        "regions": regions,
        "gangseo": {
            "name": "서울특별시 강서구",
            "code": GANGSEO_CODE,
            "metrics": gangseo_metrics,
            "dong_population_ranking": gangseo_rank_table,
        },
        "trend_12m": trend,
        "display_hints": {
            "signed_examples": {
                "district_mom_population": format_signed(district_metrics["change"]["mom_population"]),
                "district_yoy_population": format_signed(district_metrics["change"]["yoy_population"]),
            }
        },
    }

    json_path = data_dir / "district-stats.json"
    js_path = data_dir / "district-stats.js"

    json_text = json.dumps(result, ensure_ascii=False, indent=2)
    json_path.write_text(json_text + "\n", encoding="utf-8")
    js_path.write_text(f"window.DISTRICT_STATS = {json_text};\n", encoding="utf-8")

    print(f"Wrote {json_path}")
    print(f"Wrote {js_path}")


if __name__ == "__main__":
    main()
