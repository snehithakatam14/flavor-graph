import json
import csv
import math
import os
from collections import defaultdict

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, '..', 'data')

# Load
with open(os.path.join(DATA_DIR, 'train.json'), encoding='utf-8') as f:
    recipes = json.load(f)

print(f"Loaded {len(recipes)} recipes")
print(f"Sample record: {recipes[0]}")

# Normalize ingredient names
STOPWORDS = [
    'fresh', 'chopped', 'diced', 'sliced', 'minced', 'ground', 'dried',
    'frozen', 'large', 'small', 'medium', 'whole', 'skinless', 'boneless',
    'cooked', 'raw', 'uncooked', 'extra', 'virgin', 'pure', 'organic',
    'low-fat', 'low fat', 'fat-free', 'fat free', 'reduced', 'unsalted',
    'salted', 'lightly', 'finely', 'roughly', 'thinly', 'firmly'
]

def normalize(name):
    name = name.lower().strip()
    for w in STOPWORDS:
        name = name.replace(w, '')
    name = ' '.join(name.split())
    return name

# Build co-occurrence counts
ingredient_freq = defaultdict(int)
pair_freq = defaultdict(int)
recipe_rows = []

for r in recipes:
    ingredients = list({normalize(i) for i in r['ingredients'] if normalize(i)})
    recipe_rows.append({
        'recipe_id': str(r['id']),
        'name': f"Recipe {r['id']}",
        'cuisine': r['cuisine'],
        'ingredients': ingredients
    })
    for ing in ingredients:
        ingredient_freq[ing] += 1
    for i in range(len(ingredients)):
        for j in range(i + 1, len(ingredients)):
            pair = tuple(sorted([ingredients[i], ingredients[j]]))
            pair_freq[pair] += 1

print(f"Raw unique ingredients: {len(ingredient_freq)}")
print(f"Raw unique pairs: {len(pair_freq)}")

# Filter rare ingredients
MIN_INGREDIENT_FREQ = 5
common_ingredients = {k for k, v in ingredient_freq.items() if v >= MIN_INGREDIENT_FREQ}
print(f"Ingredients after freq filter (>={MIN_INGREDIENT_FREQ}): {len(common_ingredients)}")

# Score pairs
# score = count / sqrt(freq_A * freq_B)  (cosine-style association)
MIN_PAIR_FREQ = 3
pairs = []
for (a, b), count in pair_freq.items():
    if a in common_ingredients and b in common_ingredients and count >= MIN_PAIR_FREQ:
        score = round(count / math.sqrt(ingredient_freq[a] * ingredient_freq[b]), 4)
        pairs.append({
            'ingredient_a': a,
            'ingredient_b': b,
            'score': score,
            'shared_recipe_count': count
        })

pairs.sort(key=lambda x: x['score'], reverse=True)
print(f"Pairs after filtering: {len(pairs)}")

# Write CSVs

# 1. ingredients.csv
ingredients_path = os.path.join(DATA_DIR, 'ingredients.csv')
with open(ingredients_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['name'])
    writer.writeheader()
    for name in sorted(common_ingredients):
        writer.writerow({'name': name})
print(f"ingredients.csv: {len(common_ingredients)} rows")

# 2. recipes.csv
recipes_path = os.path.join(DATA_DIR, 'recipes.csv')
with open(recipes_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['recipe_id', 'name', 'cuisine'])
    writer.writeheader()
    for r in recipe_rows:
        writer.writerow({'recipe_id': r['recipe_id'], 'name': r['name'], 'cuisine': r['cuisine']})
print(f"recipes.csv: {len(recipe_rows)} rows")

# 3. contains.csv
contains_path = os.path.join(DATA_DIR, 'contains.csv')
with open(contains_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['recipe_id', 'ingredient'])
    writer.writeheader()
    count = 0
    for r in recipe_rows:
        for ing in r['ingredients']:
            if ing in common_ingredients:
                writer.writerow({'recipe_id': r['recipe_id'], 'ingredient': ing})
                count += 1
print(f"contains.csv: {count} rows")

# 4. pairs.csv
pairs_path = os.path.join(DATA_DIR, 'pairs.csv')
with open(pairs_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['ingredient_a', 'ingredient_b', 'score', 'shared_recipe_count'])
    writer.writeheader()
    writer.writerows(pairs)
print(f"pairs.csv: {len(pairs)} rows")

print("\nAll CSVs written to data/")
