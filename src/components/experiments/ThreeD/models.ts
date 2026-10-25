import type { TreeDefinition } from './TreeTemplate';
import { sakuraTree } from './SakuraTree';
import { oakTree } from './OakTree';
import { norwaySpruce } from './NorwaySpruce';
import { weepingWillow } from './WeepingWillow';
import { coconutPalm } from './CoconutPalm';
import { baobab } from './Baobab';
import { japaneseMaple } from './JapaneseMaple';

// Register a definition here to add it to the playground's model selector.
export const TREE_MODELS: readonly TreeDefinition[] = [
    sakuraTree, oakTree, norwaySpruce, weepingWillow, coconutPalm, baobab, japaneseMaple,
];
