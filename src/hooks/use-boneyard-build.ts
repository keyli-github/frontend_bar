'use client';

import { useSyncExternalStore } from 'react';

type BoneyardWindow = Window & { __BONEYARD_BUILD?: boolean };

const subscribe = () => () => {};
const getServerSnapshot = () => false;
const getSnapshot = () =>
  typeof window !== 'undefined' &&
  Boolean((window as BoneyardWindow).__BONEYARD_BUILD);

/** `true` solo dentro del navegador controlado por `boneyard-js build`. */
export function useBoneyardBuild(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
