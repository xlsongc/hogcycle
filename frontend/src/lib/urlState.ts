/**
 * View state in the query string, so a view can be shared and survives a
 * reload.
 *
 * The site is a static export, so there is no server to read the query: the
 * page prerenders its defaults, and the client reads the URL after mount.
 * `useSearchParams` would do the same but forces a Suspense boundary around
 * every page that uses it, for no gain here. replaceState rather than
 * pushState: changing a filter is not a navigation, and Back should leave
 * the page, not undo the last click.
 */

export function readParams(): URLSearchParams {
  try {
    return new URLSearchParams(window.location.search);
  } catch {
    return new URLSearchParams();
  }
}

export function writeParams(update: Record<string, string | null>): void {
  try {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(update)) {
      if (value == null || value === "") url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    // Commas and colons are legal in a query; leaving them unescaped keeps a
    // shared link readable (?s=sow_inventory,hog_price_index&lag=sow_inventory:10).
    const search = url.search.replace(/%2C/gi, ",").replace(/%3A/gi, ":");
    window.history.replaceState(window.history.state, "", url.pathname + search + url.hash);
  } catch {
    // A sandboxed frame can refuse history access; the view still works,
    // it just cannot be shared by URL.
  }
}
