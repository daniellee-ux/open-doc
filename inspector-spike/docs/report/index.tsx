import type { ComponentType } from 'react';
import { Cover } from './sections/cover';
import { Findings } from './sections/findings';

// The document module: array order == reading order. Sections live in their own
// files under sections/ — the multi-file layout the inspector must resolve.
const sections: ComponentType[] = [Cover, Findings];
export default sections;
