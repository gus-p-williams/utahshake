"""Travel-time table for distant quakes (Quake Explorer, investigation D).

Writes docs/app/data/traveltimes-iasp91.json: for each quake depth and each
distance (0-180 degrees), the time of the first P-type and first S-type wave
through the iasp91 Earth model, computed with ObsPy's TauP. The app looks
times up in this table; it never calls a travel-time web service (the
EarthScope/IRIS one has been retired).

Needs ObsPy (pip install obspy). Run from the repository root:

    python tools/quake-explorer/traveltime_table.py
"""
import json
import pathlib

from obspy.taup import TauPyModel

DEPTHS_KM = [0, 10, 33, 70, 150, 300, 500, 700]
DISTANCES_DEG = list(range(0, 181))
# First arrivals of each kind. P-type includes the core phases (PKP, PKIKP)
# and P diffracted along the core (Pdiff); S-type likewise. The shadow zone
# shows up as the phase name changing from P/Pdiff to PKP.
P_PHASES = ["P", "p", "Pn", "Pg", "Pdiff", "PKP", "PKIKP", "PKiKP"]
S_PHASES = ["S", "s", "Sn", "Sg", "Sdiff", "SKS", "SKIKS"]


def first(model, depth, dist, phases):
    arrivals = model.get_travel_times(source_depth_in_km=depth, distance_in_degree=dist,
                                      phase_list=phases)
    if not arrivals:
        return None, None
    a = min(arrivals, key=lambda x: x.time)
    return round(a.time, 2), a.name


def main():
    model = TauPyModel(model="iasp91")
    out = {
        "about": "First P-type and S-type arrival times (s after origin) in the iasp91 Earth "
                 "model, by quake depth (km) and distance (degrees). Made with ObsPy TauP by "
                 "tools/quake-explorer/traveltime_table.py.",
        "model": "iasp91",
        "depthsKm": DEPTHS_KM,
        "distDeg": DISTANCES_DEG,
        "P": [], "Pphase": [], "S": [], "Sphase": [],
    }
    for depth in DEPTHS_KM:
        rows = {"P": [], "Pphase": [], "S": [], "Sphase": []}
        for dist in DISTANCES_DEG:
            tp, np_ = first(model, depth, dist, P_PHASES)
            ts, ns = first(model, depth, dist, S_PHASES)
            rows["P"].append(tp)
            rows["Pphase"].append(np_)
            rows["S"].append(ts)
            rows["Sphase"].append(ns)
        for k, v in rows.items():
            out[k].append(v)
        print(f"depth {depth} km done")
    root = pathlib.Path(__file__).resolve().parents[2]
    path = root / "docs" / "app" / "data" / "traveltimes-iasp91.json"
    path.write_text(json.dumps(out, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"wrote {path} ({path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
