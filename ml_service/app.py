
from flask import Flask, request, jsonify
from sklearn.linear_model import LinearRegression
import numpy as np

app = Flask(__name__)

# Train a tiny regression on synthetic data to map (lat, lon, avg_temp) -> UHI 0..100
rng = np.random.default_rng(42)
N = 1200
lat = rng.uniform(-60, 60, N)
lon = rng.uniform(-150, 150, N)
avg = rng.uniform(-5, 35, N)

# Construct a synthetic "true" UHI function:
# hotter temps -> higher UHI; near 0-30 latitude bands slightly higher; some noise
uhi_true = (
    np.clip((avg - 10) / 20, 0, 1) * 70
    + (30 - np.abs(lat)) * 0.6  # lower absolute latitude, a bit higher
    + (np.abs(lon) * 0.02)      # tiny role of longitude for variety
)
uhi_true = np.clip(uhi_true + rng.normal(0, 5, N), 0, 100)

X = np.column_stack([lat, lon, avg])
y = uhi_true
model = LinearRegression().fit(X, y)

def build_advice(uhi: float):
    tips = []
    if uhi >= 70:
        label = "High"
        tips += [
            "Prioritise large-scale greening (parks, urban forests) and shade corridors.",
            "Implement cool-roof programs and reflective pavements in market / high-traffic zones.",
            "Deploy temporary cooling centers & shaded transit stops during heat waves.",
        ]
    elif uhi >= 45:
        label = "Moderate"
        tips += [
            "Target pilot retrofits: cool roofs, tree-planting, and permeable pavements in hotspot neighborhoods.",
            "Encourage building designs with cross-ventilation and outdoor shade.",
        ]
    else:
        label = "Low"
        tips += [
            "Maintain urban canopy, protect open green areas, and monitor changes.",
            "Use pocket parks and community tree initiatives to keep UHI low.",
        ]
    tips.append("Mapping tips: sample day & night, gather rooftop sensors, overlay land-cover/traffic data.")
    return label, tips

@app.post('/predict')
def predict():
    try:
        data = request.get_json(force=True)
        lat = float(data.get('lat'))
        lon = float(data.get('lon'))
        avg_temp = float(data.get('avg_temp'))
    except Exception as e:
        return jsonify({'error':'bad_request','detail':str(e)}), 400

    uhi = float(np.clip(model.predict(np.array([[lat, lon, avg_temp]]))[0], 0, 100))
    label, tips = build_advice(uhi)
    return jsonify({
        'uhi': uhi,
        'label': label,
        'advice': tips
    })

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001)
