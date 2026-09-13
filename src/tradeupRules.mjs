// Kimlik tabanlı sözleşme modeli. Eksik koleksiyon yerine genel havuz uydurulmaz.
export const NEXT_RARITY = {
  'Consumer Grade': 'Industrial Grade', 'Industrial Grade': 'Mil-Spec Grade',
  'Mil-Spec Grade': 'Restricted', Restricted: 'Classified', Classified: 'Covert',
};
export const isSpecial = skin => ['Knives', 'Gloves'].includes(skin?.category?.name) || skin?.name?.startsWith('★');
export function hasFloatRange(skin) {
  return Number.isFinite(skin?.min_float) && Number.isFinite(skin?.max_float) && skin.min_float >= 0 && skin.max_float <= 1 && skin.max_float >= skin.min_float;
}
export function defaultInputFloat(skin) {
  return Math.min(skin.max_float, Math.max(skin.min_float, 0.15));
}
export function normalizedFloat(skin, value) {
  if (!hasFloatRange(skin) || !Number.isFinite(value) || value < skin.min_float || value > skin.max_float) return null;
  return skin.max_float === skin.min_float ? 0 : (value - skin.min_float) / (skin.max_float - skin.min_float);
}
export function buildTradeupRoutes(skins, collections, crates, stattrak = false) {
  const byId = new Map(skins.map(skin => [skin.id, skin]));
  const routes = new Map();
  for (const skin of skins) {
    if (!skin.id?.startsWith('skin-') || isSpecial(skin) || !hasFloatRange(skin) || (stattrak && !skin.stattrak)) continue;
    let groups;
    if (skin.rarity?.name === 'Covert') {
      groups = crates.filter(crate => crate.type === 'Case' && crate.contains?.some(item => item.id === skin.id))
        .map(crate => ({ name: crate.name, items: crate.contains_rare || [] }));
    } else {
      const next = NEXT_RARITY[skin.rarity?.name];
      if (!next) continue;
      const ids = new Set((skin.collections || []).map(col => col.id));
      groups = collections.filter(col => ids.size ? ids.has(col.id) : col.contains?.some(item => item.id === skin.id))
        .map(col => ({ name: col.name, items: (col.contains || []).filter(item => item.rarity?.name === next) }));
    }
    const pools = groups.map(group => ({ name: group.name, items: [...new Map(group.items
      .map(item => byId.get(item.id)).filter(item => item && (hasFloatRange(item) || (isSpecial(item) && !item.name.includes('|'))) && (!stattrak || item.stattrak))
      .map(item => [item.id, item])).values()] }));
    // Üst kademe içermeyen koleksiyonların girdileri sözleşmeye alınmaz.
    if (pools.length && pools.every(pool => pool.items.length)) routes.set(skin.id, pools);
  }
  return routes;
}
export function calculateTradeup(slots, routes) {
  const entries = slots.filter(Boolean);
  if (!entries.length) return null;
  const rarity = entries[0].skin.rarity?.name;
  const stattrak = !!entries[0].skin.isStatTrak;
  const floats = entries.map(entry => normalizedFloat(entry.skin, entry.float));
  if (floats.some(value => value === null) || entries.some(entry => entry.skin.isSouvenir || !!entry.skin.isStatTrak !== stattrak || entry.skin.rarity?.name !== rarity || !routes.has(entry.skin.id))) return null;
  const avgNormFloat = floats.reduce((sum, value) => sum + value, 0) / entries.length;
  const outcomes = new Map();
  const sources = new Set();
  for (const entry of entries) {
    const pools = routes.get(entry.skin.id);
    for (const pool of pools) {
      sources.add(pool.name);
      for (const skin of pool.items) {
        const chance = 100 / entries.length / pools.length / pool.items.length;
        if (outcomes.has(skin.id)) outcomes.get(skin.id).chance += chance;
        else outcomes.set(skin.id, { skin: { ...skin, isStatTrak: stattrak }, chance,
          // Ara yuvarlama 0.06999 değerini yanlışlıkla Minimal Wear yapmamalı.
          outFloat: hasFloatRange(skin) ? skin.min_float + avgNormFloat * (skin.max_float - skin.min_float) : null });
      }
    }
  }
  return { avgNormFloat, avgFloat: entries.reduce((sum, entry) => sum + entry.float, 0) / entries.length,
    outcomes: [...outcomes.values()], sourceCollectionNames: [...sources], isKnifeRecipe: rarity === 'Covert' };
}
