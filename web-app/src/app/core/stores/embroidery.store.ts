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
  embroideryList: Embroidery[];
}

const initialState: EmbroideryState = {
  embroideryList: [],
};

export const EmbroideryStore = signalStore(
  { providedIn: 'root' },
  withState<EmbroideryState>(initialState),
  withComputed(({ embroideryList }) => ({
    embroidery: computed(() => embroideryList()),
  })),
  withMethods((store) => {
    const embroideryService = inject(EmbroideryService);
    return {
      loadEmbroideries(): void {
        embroideryService.getEmbroideries().subscribe({
          next: (response) => {
            patchState(store, { embroideryList: response.results });
          },
          error: (err) => {
            console.error('Error fetching embroideries:', err);
          },
        });
      },
      /** Replace one embroidery in the list after create/update (by id). */
      updateEmbroidery(embroidery: Embroidery): void {
        const list = store.embroideryList();
        const index = list.findIndex((e) => e.id === embroidery.id);
        if (index === -1) {
          return;
        }
        const next = [...list];
        next[index] = { ...next[index], ...embroidery };
        patchState(store, { embroideryList: next });
      },
      deleteEmbroidery(id: number): void {
        patchState(store, {
          embroideryList: store.embroideryList().filter((e) => e.id !== id),
        });
      },
      addEmbroidery(embroidery: Embroidery): void {
        const list = [...store.embroideryList(), embroidery];
        list.sort((a, b) => a.name.localeCompare(b.name));
        patchState(store, { embroideryList: list });
      },
    };
  })
);
