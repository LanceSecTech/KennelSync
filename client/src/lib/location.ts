import { isNativeAppClient } from "@/lib/capacitorPlatform";

export type DeviceLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export async function getCurrentDeviceLocation(): Promise<DeviceLocation> {
  if (isNativeAppClient()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.checkPermissions();
    if (perm.location !== "granted") {
      const requested = await Geolocation.requestPermissions();
      if (requested.location !== "granted") {
        throw new Error("Location permission was denied");
      }
    }
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 30_000,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
    };
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Geolocation is not available on this device");
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 30_000,
    });
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
  };
}
