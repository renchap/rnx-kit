import type { Preset } from "../../types";
import profile_0_61 from "./react-native/profile-0.61";
import profile_0_62 from "./react-native/profile-0.62";
import profile_0_63 from "./react-native/profile-0.63";
import profile_0_64 from "./react-native/profile-0.64";
import profile_0_65 from "./react-native/profile-0.65";
import profile_0_66 from "./react-native/profile-0.66";
import profile_0_67 from "./react-native/profile-0.67";
import profile_0_68 from "./react-native/profile-0.68";
import profile_0_69 from "./react-native/profile-0.69";
import profile_0_70 from "./react-native/profile-0.70";
import profile_0_71 from "./react-native/profile-0.71";
import profile_0_72 from "./react-native/profile-0.72";

// Also export this by name for scripts to work around a bug where this module
// is wrapped twice, i.e. `{ default: { default: preset } }`, when imported as
// ESM.
export const preset: Readonly<Preset> = {
  "0.61": profile_0_61,
  "0.62": profile_0_62,
  "0.63": profile_0_63,
  "0.64": profile_0_64,
  "0.65": profile_0_65,
  "0.66": profile_0_66,
  "0.67": profile_0_67,
  "0.68": profile_0_68,
  "0.69": profile_0_69,
  "0.70": profile_0_70,
  "0.71": profile_0_71,
  "0.72": profile_0_72,
};

export default preset;
