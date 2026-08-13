import {
  Castle,
  Landmark,
  Trees,
  Palette,
  MountainSnow,
  Sparkles,
  CloudRain,
  CalendarRange,
  Gem,
  Droplets,
  Route,
  Lamp,
  House,
  Fish,
  Sprout,
  Bird,
  Mountain,
  Sunrise,
  Music,
  DoorOpen,
  Shield,
  Flame,
  Plane,
  Ship,
  type LucideIcon,
} from "lucide-react";

/**
 * Maps the string icon keys stored in data files to lucide components,
 * so data modules stay free of JSX/component imports.
 */
export const ICONS: Record<string, LucideIcon> = {
  castle: Castle,
  landmark: Landmark,
  trees: Trees,
  palette: Palette,
  "mountain-snow": MountainSnow,
  sparkles: Sparkles,
  "cloud-rain": CloudRain,
  "calendar-range": CalendarRange,
  gem: Gem,
  droplets: Droplets,
  route: Route,
  lamp: Lamp,
  house: House,
  fish: Fish,
  sprout: Sprout,
  bird: Bird,
  mountain: Mountain,
  sunrise: Sunrise,
  music: Music,
  "door-open": DoorOpen,
  shield: Shield,
  flame: Flame,
  plane: Plane,
  ship: Ship,
};

export function getIcon(key: string): LucideIcon {
  return ICONS[key] ?? Sparkles;
}
