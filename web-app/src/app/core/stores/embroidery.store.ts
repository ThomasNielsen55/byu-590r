import { computed, inject } from '@angular/core';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { EmbroideryService, Embroidery } from '../services/embroidery.service';

export interface EmbroideryState {
  embroideriesList: Embroidery[];
}

const initialState: EmbroideryState = {
  embroideriesList: [],
};

export const EmbroideryStore = signalStore(
  { providedIn: 'root' },
  withState<EmbroideryState>(initialState),
  withComputed(({ embroideriesList }) => ({
    embroideries: computed(() => embroideriesList()),
  })),
  withMethods((store) => {
    const embroideryService = inject(EmbroideryService);
    return {
      loadEmbroideries(): void {
        embroideryService.getEmbroideries().subscribe({
          next: (response) => {
            patchState(store, { embroideriesList: response.results });
          },
          error: (err) => {
            console.error('Error fetching embroideries:', err);
          },
        });
      },
      updateEmbroideryPicture(embroidery: Embroidery): void {
        const list = store.embroideriesList();
        const index = list.findIndex((e) => e.id === embroidery.id);
        if (index === -1) {
          return;
        }
        const next = [...list];
        next[index] = { ...next[index], ...embroidery };
        patchState(store, { embroideriesList: next });
      },
      addEmbroidery(embroidery: Embroidery): void {
        const list = [...store.embroideriesList(), embroidery];
        list.sort((a, b) => a.name.localeCompare(b.name));
        patchState(store, { embroideriesList: list });
      },
    };
  })
);
