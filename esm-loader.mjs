/**
 * Load all local modules as ESM (instead of just .mjs)
 */
export function resolve(specifier, parentModuleURL, defaultResolve) {
    const resolved = defaultResolve(specifier, parentModuleURL);

    if (/^\.{0,2}[/]/.test(specifier) === true)
        resolved.format = 'esm';

    return resolved;
}
