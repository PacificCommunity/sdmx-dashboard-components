import type { ReactNode } from 'react';
import type { SDMXRenderError } from '../errors';
import type { SDMXVisualProps } from '../components/types';

type FailureSlots = Pick<SDMXVisualProps, 'renderEmpty' | 'renderError'>;

// the consumer's replacement for a failed visual, or undefined to keep the
// built-in presentation. renderEmpty takes zero-observation results
// (ERR_EMPTY) before renderError sees them.
export const failureSlot = (
    error: SDMXRenderError,
    visualId: string,
    { renderEmpty, renderError }: FailureSlots
): ReactNode | undefined => {
    if (error.code === 'ERR_EMPTY' && renderEmpty) return renderEmpty(visualId);
    if (renderError) return renderError(error);
    return undefined;
};
