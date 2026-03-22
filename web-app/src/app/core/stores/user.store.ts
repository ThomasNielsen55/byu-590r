import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { User, UserService } from '../services/user.service';
import { Observable, tap } from 'rxjs';

export interface UserState {
  user: User | null;
}

const initialState: UserState = {
  user: null,
};

export const UserStore = signalStore(
  { providedIn: 'root' },
  withState<UserState>(initialState),
  withComputed(({ user }) => ({
    isLoaded: computed(() => user() !== null),
    userEmail: computed(() => user()?.email || ''),
    userName: computed(() => user()?.name || ''),
  })),
  withMethods((store) => ({
    setUser(user: User): void {
      patchState(store, { user });
    },
    setEmail(email: string): void {
      const currentUser = store.user();
      if (currentUser) {
        patchState(store, {
          user: {
            ...currentUser,
            email,
          },
        });
      }
    },
    setAvatar(avatar: string | null): void {
      const currentUser = store.user();
      if (currentUser) {
        patchState(store, {
          user: {
            ...currentUser,
            avatar,
          },
        });
      }
    },
  })),
  withMethods((store, userService = inject(UserService)) => ({
    addOrReplaceAvatar(image: File): Observable<{ success: boolean; results: { avatar: string }; message: string }> {
      return userService.uploadAvatar(image).pipe(
        tap((response) => {
          const currentUser = store.user();
          if (currentUser) {
            patchState(store, {
              user: {
                ...currentUser,
                avatar: response.results.avatar,
              },
            });
          }
        })
      );
    },
    removeAvatar(): Observable<{ success: boolean; results: { avatar: null }; message: string }> {
      return userService.removeAvatar().pipe(
        tap(() => {
          const currentUser = store.user();
          if (currentUser) {
            patchState(store, {
              user: {
                ...currentUser,
                avatar: null,
              },
            });
          }
        })
      );
    },
  }))
);
