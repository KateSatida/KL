// Station registry. Each station "type" in config/game.json maps to a file here.
//
// To add a new station:
//   1. create static/js/stations/my-station.js exporting a function
//        (def, game) => ({ open() {...}, draw?(ctx, def, now, world), onClick?(point) })
//   2. import it below and add it to STATION_TYPES
//   3. add { "type": "my-station", ... } to "stations" in config/game.json
import photobooth from "./photobooth.js";
import bar from "./bar.js";
import singles from "./singles.js";
import projector from "./projector.js";
import wardrobe from "./wardrobe.js";
import wishingTree from "./wishing-tree.js";
import memoryLane from "./memory-lane.js";
import dancefloor from "./dancefloor.js";
import bouquet from "./bouquet.js";

export const STATION_TYPES = {
  photobooth, bar, singles, projector, wardrobe,
  "wishing-tree": wishingTree, "memory-lane": memoryLane, dancefloor, bouquet,
};

export function createStations(config, game) {
  return config.stations
    .filter((def) => {
      if (!STATION_TYPES[def.type]) console.warn(`Unknown station type "${def.type}"`);
      return STATION_TYPES[def.type];
    })
    .map((def) => ({ def, module: STATION_TYPES[def.type](def, game) }));
}
