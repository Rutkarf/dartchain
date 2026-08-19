import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';

import {
  METERS_PER_DEGREE_LATITUDE,
  metersPerDegreeLongitude,
} from './geo-projection.constants';
import { LocalOriginService } from './local-origin.service';

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  altitude: number;
}

/**
 * Conversion stable lat/lon/alt ↔ coordonnées Three.js locales.
 *
 * Projection équirectangulaire locale :
 *   x = Δlon × cos(latOrigin) × mètresParDegré × worldScale
 *   z = −Δlat × mètresParDegré × worldScale
 *   y = (altitude − altitudeOrigin) × worldScale
 */
@Injectable({ providedIn: 'root' })
export class GeoCoordinateService {
  private readonly origin = inject(LocalOriginService);

  private readonly scratch = new THREE.Vector3();

  geoToWorld(latitude: number, longitude: number, altitude = 0): THREE.Vector3 {
    const scale = this.origin.worldScale;
    const deltaLat = latitude - this.origin.latitude;
    const deltaLon = longitude - this.origin.longitude;
    const metersLon = metersPerDegreeLongitude(this.origin.latitude);

    this.scratch.set(
      deltaLon * metersLon * scale,
      (altitude - this.origin.altitude) * scale,
      -deltaLat * METERS_PER_DEGREE_LATITUDE * scale
    );
    return this.scratch.clone();
  }

  worldToGeo(position: THREE.Vector3): GeoCoordinates {
    const scale = this.origin.worldScale || 1;
    const metersLon = metersPerDegreeLongitude(this.origin.latitude);

    const deltaLon = position.x / (metersLon * scale);
    const deltaLat = -position.z / (METERS_PER_DEGREE_LATITUDE * scale);
    const altitude = position.y / scale + this.origin.altitude;

    return {
      latitude: this.origin.latitude + deltaLat,
      longitude: this.origin.longitude + deltaLon,
      altitude,
    };
  }
}
