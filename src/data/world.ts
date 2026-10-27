import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import landTopology from "world-atlas/land-110m.json";

/** Контуры суши Natural Earth (110 м) в GeoJSON для проекции d3-geo. */
const topology = landTopology as unknown as Topology<{
  land: GeometryCollection;
}>;

export const LAND = feature(topology, topology.objects.land);
