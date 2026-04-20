import { computed, inject } from '@angular/core';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { EmbroideryService, Embroidery } from '../services/embroidery.service';
import { formatHttpApiError } from '../utils/http-api-error';

export interface EmbroideryState {
  embroideryList: Embroidery[];
  loadError: string | null;
}

const initialState: EmbroideryState = {
  embroideryList: [],
  loadError: null,
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
      clearLoadError(): void {
        patchState(store, { loadError: null });
      },
      loadEmbroideries(): void {
        patchState(store, { loadError: null });
        embroideryService.getEmbroideries().subscribe({
          next: (response) => {
            patchState(store, {
              embroideryList: response.results,
              loadError: null,
            });
          },
          error: (err) => {
            patchState(store, {
              loadError: formatHttpApiError(
                err,
                'Could not load your embroidery list. Pull to refresh or try again.'
              ),
            });
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
