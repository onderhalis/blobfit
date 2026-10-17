import { router } from 'expo-router';

type TabHref = '/' | '/plan' | '/progress' | '/more';

/**
 * Return to the tab navigator at the root of the stack and switch to `href`.
 * `replace`/`dismissTo` would stack a second tab navigator when the tabs are
 * currently showing a different tab.
 */
export function goToTab(href: TabHref) {
  if (router.canDismiss()) {
    router.dismissAll();
  }
  router.navigate(href);
}
