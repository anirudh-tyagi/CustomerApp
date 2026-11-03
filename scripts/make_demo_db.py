#!/usr/bin/env python3
"""
Generate SYNTHETIC demo customers for the Customer Map app (Python stdlib only).

Schema (exactly): customers(id, name, address, phone, latitude, longitude)

What is real vs synthetic
- REAL-BASED: city, state, locality name, PIN code and the locality's approximate
  coordinates (about +/-1-2 km, from memory, NOT surveyed). Pins are jittered a small
  distance around the locality centre.
- SYNTHETIC: business names, shop numbers, street names, phone numbers.
- Phone numbers are random but valid-format Indian mobiles; some may belong to real people.
  Do not tap "Call" on them.

Usage:
  python3 make_demo_db.py                      # customers.db (500 clean) + customers.csv
  python3 make_demo_db.py --count 10000 --out customers_10000.db --no-csv
  python3 make_demo_db.py --count 500 --bad-rows --out customers_test_bad_rows.db --no-csv
"""
import argparse, csv, math, os, random, re, sqlite3
from collections import Counter

# (city, state, locality, pin, lat, lng, jitter_m, weight)
L = [
 ("Delhi","Delhi","Connaught Place","110001",28.6315,77.2167,300,6),
 ("Delhi","Delhi","Karol Bagh","110005",28.6519,77.1909,400,5),
 ("Delhi","Delhi","Lajpat Nagar","110024",28.5677,77.2433,400,5),
 ("Delhi","Delhi","Dwarka Sector 10","110075",28.5823,77.0500,500,4),
 ("Delhi","Delhi","Saket","110017",28.5245,77.2066,400,4),
 ("Delhi","Delhi","Nehru Place","110019",28.5491,77.2533,300,4),
 ("Delhi","Delhi","Chandni Chowk","110006",28.6506,77.2303,250,4),
 ("Gurugram","Haryana","Sector 29","122001",28.4595,77.0680,400,3),
 ("Gurugram","Haryana","DLF Phase 3","122002",28.4934,77.0955,400,3),
 ("Gurugram","Haryana","Udyog Vihar","122016",28.5016,77.0830,500,3),
 ("Gurugram","Haryana","Sohna Road","122018",28.4170,77.0420,500,2),
 ("Noida","Uttar Pradesh","Sector 18","201301",28.5703,77.3219,350,3),
 ("Noida","Uttar Pradesh","Sector 62","201309",28.6271,77.3649,450,3),
 ("Mumbai","Maharashtra","Andheri West","400058",19.1363,72.8277,500,6),
 ("Mumbai","Maharashtra","Bandra West","400050",19.0630,72.8340,200,4),
 ("Mumbai","Maharashtra","Colaba","400005",18.9150,72.8318,150,3),
 ("Mumbai","Maharashtra","Powai","400076",19.1176,72.9060,450,4),
 ("Mumbai","Maharashtra","Dadar","400014",19.0178,72.8478,350,4),
 ("Mumbai","Maharashtra","Borivali West","400092",19.2307,72.8567,450,4),
 ("Mumbai","Maharashtra","Lower Parel","400013",18.9930,72.8300,300,3),
 ("Navi Mumbai","Maharashtra","Vashi","400703",19.0771,72.9986,450,3),
 ("Pune","Maharashtra","Koregaon Park","411001",18.5362,73.8939,350,3),
 ("Pune","Maharashtra","Hinjewadi","411057",18.5912,73.7389,600,3),
 ("Pune","Maharashtra","Kothrud","411038",18.5074,73.8077,450,3),
 ("Pune","Maharashtra","Viman Nagar","411014",18.5679,73.9143,400,3),
 ("Pune","Maharashtra","Shivajinagar","411005",18.5308,73.8475,350,3),
 ("Bengaluru","Karnataka","Koramangala","560034",12.9352,77.6245,450,5),
 ("Bengaluru","Karnataka","Indiranagar","560038",12.9784,77.6408,400,4),
 ("Bengaluru","Karnataka","Whitefield","560066",12.9698,77.7500,700,4),
 ("Bengaluru","Karnataka","Jayanagar","560011",12.9250,77.5938,400,4),
 ("Bengaluru","Karnataka","MG Road","560001",12.9753,77.6068,300,4),
 ("Bengaluru","Karnataka","Electronic City","560100",12.8452,77.6602,600,3),
 ("Bengaluru","Karnataka","Malleshwaram","560003",13.0035,77.5647,350,3),
 ("Chennai","Tamil Nadu","T. Nagar","600017",13.0418,80.2341,350,4),
 ("Chennai","Tamil Nadu","Adyar","600020",13.0012,80.2565,250,3),
 ("Chennai","Tamil Nadu","Anna Nagar","600040",13.0850,80.2101,450,4),
 ("Chennai","Tamil Nadu","Velachery","600042",12.9815,80.2180,400,3),
 ("Chennai","Tamil Nadu","Mylapore","600004",13.0339,80.2697,200,3),
 ("Chennai","Tamil Nadu","Guindy","600032",13.0067,80.2206,350,3),
 ("Hyderabad","Telangana","Banjara Hills","500034",17.4156,78.4347,450,4),
 ("Hyderabad","Telangana","Madhapur","500081",17.4486,78.3908,450,4),
 ("Hyderabad","Telangana","Secunderabad","500003",17.4399,78.4983,450,4),
 ("Hyderabad","Telangana","Gachibowli","500032",17.4401,78.3489,500,3),
 ("Hyderabad","Telangana","Ameerpet","500016",17.4375,78.4483,350,3),
 ("Kolkata","West Bengal","Park Street","700016",22.5535,88.3520,300,4),
 ("Kolkata","West Bengal","Salt Lake Sector V","700091",22.5726,88.4338,450,4),
 ("Howrah","West Bengal","Howrah","711101",22.5958,88.2636,400,3),
 ("Kolkata","West Bengal","Ballygunge","700019",22.5266,88.3650,350,3),
 ("Kolkata","West Bengal","Dum Dum","700028",22.6220,88.4046,400,3),
 ("Kolkata","West Bengal","Behala","700034",22.4986,88.3115,450,3),
 ("Ahmedabad","Gujarat","Navrangpura","380009",23.0366,72.5600,350,3),
 ("Ahmedabad","Gujarat","Satellite","380015",23.0258,72.5073,450,3),
 ("Ahmedabad","Gujarat","Maninagar","380008",22.9966,72.6020,400,2),
 ("Ahmedabad","Gujarat","C.G. Road","380009",23.0300,72.5580,250,2),
 ("Ahmedabad","Gujarat","Bopal","380058",23.0330,72.4650,500,2),
 ("Surat","Gujarat","Adajan","395009",21.1959,72.7933,400,3),
 ("Surat","Gujarat","Vesu","395007",21.1400,72.7700,450,2),
 ("Vadodara","Gujarat","Alkapuri","390007",22.3100,73.1700,400,3),
 ("Jaipur","Rajasthan","C-Scheme","302001",26.9100,75.7950,350,3),
 ("Jaipur","Rajasthan","Malviya Nagar","302017",26.8530,75.8100,400,3),
 ("Jaipur","Rajasthan","Vaishali Nagar","302021",26.9130,75.7260,450,2),
 ("Jaipur","Rajasthan","Mansarovar","302020",26.8500,75.7600,450,2),
 ("Jodhpur","Rajasthan","Sardarpura","342003",26.2700,73.0100,350,2),
 ("Lucknow","Uttar Pradesh","Hazratganj","226001",26.8500,80.9500,300,3),
 ("Lucknow","Uttar Pradesh","Gomti Nagar","226010",26.8550,81.0000,450,3),
 ("Lucknow","Uttar Pradesh","Alambagh","226005",26.8100,80.9000,400,2),
 ("Kanpur","Uttar Pradesh","Civil Lines","208001",26.4600,80.3400,350,2),
 ("Varanasi","Uttar Pradesh","Lanka","221005",25.2800,82.9900,350,2),
 ("Varanasi","Uttar Pradesh","Sigra","221010",25.3100,82.9800,350,1),
 ("Agra","Uttar Pradesh","Sanjay Place","282002",27.1900,78.0050,300,2),
 ("Chandigarh","Chandigarh","Sector 17","160017",30.7410,76.7830,250,2),
 ("Chandigarh","Chandigarh","Sector 22","160022",30.7330,76.7740,250,2),
 ("Chandigarh","Chandigarh","Sector 35","160035",30.7270,76.7580,250,2),
 ("Ludhiana","Punjab","Model Town","141002",30.8900,75.8300,350,2),
 ("Amritsar","Punjab","Lawrence Road","143001",31.6500,74.8650,350,2),
 ("Dehradun","Uttarakhand","Rajpur Road","248001",30.3300,78.0600,350,2),
 ("Kochi","Kerala","Edappally","682024",10.0261,76.3084,350,2),
 ("Kochi","Kerala","MG Road Ernakulam","682016",9.9816,76.2886,250,2),
 ("Kochi","Kerala","Kakkanad","682030",10.0159,76.3419,450,2),
 ("Thiruvananthapuram","Kerala","Pattom","695004",8.5240,76.9400,350,2),
 ("Coimbatore","Tamil Nadu","RS Puram","641002",11.0050,76.9500,350,2),
 ("Coimbatore","Tamil Nadu","Gandhipuram","641012",11.0183,76.9725,300,2),
 ("Madurai","Tamil Nadu","Anna Nagar","625020",9.9300,78.1500,350,2),
 ("Mysuru","Karnataka","Vijayanagar","570017",12.3300,76.6100,400,1),
 ("Visakhapatnam","Andhra Pradesh","MVP Colony","530017",17.7390,83.3270,250,2),
 ("Visakhapatnam","Andhra Pradesh","Dwaraka Nagar","530016",17.7280,83.3050,300,2),
 ("Bhubaneswar","Odisha","Saheed Nagar","751007",20.2900,85.8450,350,2),
 ("Bhubaneswar","Odisha","Patia","751024",20.3560,85.8200,450,1),
 ("Guwahati","Assam","Paltan Bazaar","781008",26.1800,91.7450,250,2),
 ("Guwahati","Assam","Dispur","781006",26.1400,91.7900,350,2),
 ("Patna","Bihar","Boring Road","800001",25.6100,85.1200,350,2),
 ("Patna","Bihar","Kankarbagh","800020",25.5900,85.1650,400,2),
 ("Ranchi","Jharkhand","Main Road","834001",23.3700,85.3250,350,2),
 ("Raipur","Chhattisgarh","Shankar Nagar","492007",21.2400,81.6500,400,2),
 ("Indore","Madhya Pradesh","Vijay Nagar","452010",22.7500,75.8950,450,2),
 ("Indore","Madhya Pradesh","Palasia","452001",22.7250,75.8800,350,2),
 ("Bhopal","Madhya Pradesh","MP Nagar","462011",23.2330,77.4300,400,2),
 ("Nagpur","Maharashtra","Dharampeth","440010",21.1350,79.0650,400,2),
 ("Nagpur","Maharashtra","Sitabuldi","440012",21.1450,79.0850,350,2),
 ("Panaji","Goa","Panaji","403001",15.4983,73.8272,150,1),
 ("Srinagar","Jammu and Kashmir","Lal Chowk","190001",34.0700,74.8100,300,1),
 ("Jammu","Jammu and Kashmir","Gandhi Nagar","180004",32.7100,74.8500,350,1),
 ("Shillong","Meghalaya","Police Bazaar","793001",25.5700,91.8800,250,1),
 ("Imphal","Manipur","Imphal","795001",24.8100,93.9400,350,1),
]

PREFIX = ["Shree","Sri","New","Royal","Modern","Om","Jai","Maa","Sai","Krishna","National",
          "Classic","Star","Super","Anand","Balaji","Ganesh","Lakshmi","Standard","Prime"]
CORE = ["Traders","Enterprises","Electricals","Hardware","Agencies","Distributors","Mart",
        "Stores","Industries","Textiles","Pharma","Foods","Auto Parts","Stationers",
        "Furniture","Electronics","Marketing","Supplies","Cold Storage","Sanitary"]
SURN = ["Sharma","Gupta","Patel","Reddy","Nair","Iyer","Singh","Khan","Das","Banerjee",
        "Joshi","Mehta","Verma","Rao","Pillai","Chopra","Kulkarni","Shah","Agarwal","Bose",
        "Menon","Yadav","Thakur","Mishra","Kapoor","Naidu","Gowda","Sethi","Bhatt","Saxena"]
STREET = ["Main Road","Station Road","Market Road","Gandhi Marg","Nehru Road","Temple Street",
          "Ring Road","Church Road","Hospital Road","College Road","Mill Road","Canal Road"]
UNIT = ["Shop No. {}","Plot {}","#{}","Unit {}","Door No. {}-{}","Office {}","Godown {}"]

PHONE_RE = re.compile(r"^\+91 [6-9]\d{4} \d{5}$")
IND = (6.0, 37.5, 68.0, 98.0)  # lat_min, lat_max, lng_min, lng_max


def hav_m(a, b, c, d):
    r = 6371000.0
    p1, p2 = math.radians(a), math.radians(c)
    dp, dl = p2 - p1, math.radians(d - b)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def make_rows(n, rng):
    weights = [x[7] for x in L]
    names, phones, rows = set(), set(), []
    for i in range(1, n + 1):
        city, state, loc, pin, lat0, lng0, jit, _ = rng.choices(L, weights)[0]
        r = jit * math.sqrt(rng.random())
        th = rng.random() * 2 * math.pi
        lat = lat0 + (r * math.cos(th)) / 111320.0
        lng = lng0 + (r * math.sin(th)) / (111320.0 * math.cos(math.radians(lat0)))
        for _ in range(50):
            form = rng.randrange(3)
            if form == 0: nm = f"{rng.choice(SURN)} {rng.choice(CORE)}"
            elif form == 1: nm = f"{rng.choice(PREFIX)} {rng.choice(CORE)}"
            else: nm = f"{rng.choice(PREFIX)} {rng.choice(SURN)} {rng.choice(CORE)}"
            if nm not in names: break
        else:
            nm = f"{nm} & Co {i}"
        names.add(nm)
        while True:
            ph = f"+91 {rng.choice('9988776')}{rng.randrange(10**4):04d} {rng.randrange(10**5):05d}"
            if ph not in phones: phones.add(ph); break
        u = rng.choice(UNIT)
        unit = u.format(rng.randint(1, 240), rng.randint(1, 9)) if u.count("{}") == 2 else u.format(rng.randint(1, 240))
        addr = f"{unit}, {rng.choice(STREET)}, {loc}, {city}, {state} - {pin}"
        rows.append([i, nm, addr, ph, round(lat, 6), round(lng, 6)])
    return rows


def corrupt(rows, rng):
    """~2% deliberately bad rows for error-handling tests."""
    kinds = ["no_coords", "zero", "swapped", "abroad", "text", "no_name", "no_phone", "no_addr"]
    k = 0
    for idx in rng.sample(range(len(rows)), max(1, len(rows) // 50)):
        r = rows[idx]; kind = kinds[k % len(kinds)]; k += 1
        if kind == "no_coords": r[4] = r[5] = None
        elif kind == "zero": r[4] = r[5] = 0.0
        elif kind == "swapped": r[4], r[5] = r[5], r[4]
        elif kind == "abroad": r[4], r[5] = 51.5072, -0.1276
        elif kind == "text": r[4], r[5] = "abc", "xyz"
        elif kind == "no_name": r[1] = ""
        elif kind == "no_phone": r[3] = None
        elif kind == "no_addr": r[2] = None
    return rows


def write_db(path, rows):
    if os.path.exists(path): os.remove(path)
    con = sqlite3.connect(path)
    con.executescript("""
        CREATE TABLE customers (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            address TEXT,
            phone TEXT,
            latitude REAL,
            longitude REAL
        );
        CREATE INDEX idx_customers_name ON customers(name);
    """)
    con.executemany("INSERT INTO customers VALUES (?,?,?,?,?,?)", rows)
    con.commit(); con.close()


def verify_clean(path):
    centres = {f"{x[2]}, {x[0]}, {x[1]} - {x[3]}": x for x in L}
    con = sqlite3.connect(path)
    data = con.execute("SELECT id,name,address,phone,latitude,longitude FROM customers").fetchall()
    con.close()
    problems, states = [], Counter()
    for id_, nm, ad, ph, la, lo in data:
        if not nm or not ad or not ph or la is None or lo is None:
            problems.append((id_, "empty column")); continue
        if not PHONE_RE.match(ph): problems.append((id_, "bad phone"))
        if not (IND[0] <= la <= IND[1] and IND[2] <= lo <= IND[3]): problems.append((id_, "outside India"))
        key = ad.split(", ", 2)[2]
        c = centres.get(key)
        if c is None: problems.append((id_, "address/locality mismatch")); continue
        if hav_m(la, lo, c[4], c[5]) > c[6] * 1.01 + 1: problems.append((id_, "too far from locality"))
        states[c[1]] += 1
    ids = [d[0] for d in data]
    if len(set(ids)) != len(ids): problems.append((0, "duplicate ids"))
    if len({d[1] for d in data}) != len(data): problems.append((0, "duplicate names"))
    if len({d[3] for d in data}) != len(data): problems.append((0, "duplicate phones"))
    return len(data), problems, states


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=500)
    ap.add_argument("--out", default="customers.db")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--bad-rows", action="store_true")
    ap.add_argument("--no-csv", action="store_true")
    a = ap.parse_args()
    rng = random.Random(a.seed)
    rows = make_rows(a.count, rng)
    if a.bad_rows: rows = corrupt(rows, rng)
    write_db(a.out, rows)
    if not a.no_csv:
        with open(os.path.splitext(a.out)[0] + ".csv", "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f); w.writerow(["id", "name", "address", "phone", "latitude", "longitude"])
            w.writerows(rows)
    print(f"wrote {a.out}: {len(rows)} rows" + (" (with deliberate bad rows)" if a.bad_rows else ""))
    if not a.bad_rows:
        n, probs, st = verify_clean(a.out)
        print(f"verified {n} rows, problems: {len(probs)}")
        for p in probs[:10]: print("  ", p)
        print("top states:", st.most_common(6))
