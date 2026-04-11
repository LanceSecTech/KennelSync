import { Route } from "wouter";
import Settings from "./Settings";
import { SettingsAccountPage } from "./settings/SettingsAccountPage";
import { SettingsSecurityPage } from "./settings/SettingsSecurityPage";
import { SettingsNotificationsPage } from "./settings/SettingsNotificationsPage";

/**
 * Insert inside each role Switch (wouter matches path exactly; subpaths need their own Route).
 * Order: specific paths before `/settings`.
 */
export const SETTINGS_ROUTE_FRAGMENT = (
  <>
    <Route path="/settings/account" component={SettingsAccountPage} />
    <Route path="/settings/security" component={SettingsSecurityPage} />
    <Route path="/settings/notifications" component={SettingsNotificationsPage} />
    <Route path="/settings" component={Settings} />
  </>
);
