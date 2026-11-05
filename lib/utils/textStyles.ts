import type { CSSProperties } from 'react';
import type { SDMXTextConfig } from '../components/types';

/**
 * The inline style a title, subtitle or note config produces. Table, value and
 * text visuals share it so the same config renders the same way everywhere
 * (the theme's display font fills in when the config names no font).
 */
export const textConfigStyle = (
    config: SDMXTextConfig | undefined,
    displayFont?: string
): CSSProperties => ({
    ...(config?.size !== undefined ? { fontSize: config.size } : {}),
    ...(config?.color !== undefined ? { color: config.color } : {}),
    ...(config?.font ?? displayFont ? { fontFamily: config?.font ?? displayFont } : {}),
    ...(config?.style !== undefined ? { fontStyle: config.style } : {}),
    ...(config?.decoration !== undefined ? { textDecoration: config.decoration } : {}),
    ...(config?.weight !== undefined ? { fontWeight: config.weight } : {}),
    ...(config?.align !== undefined ? { textAlign: config.align } : {}),
});

/**
 * A clickable title/subtitle is a link, so it is underlined by default; an
 * explicit `decoration` still wins.
 */
export const textLinkStyle = (config: SDMXTextConfig | undefined): CSSProperties => ({
    textDecoration: config?.decoration ?? 'underline',
});
