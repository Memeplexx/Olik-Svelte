import {
  augment,
  createStore as createStoreCore,
  DeepReadonly,
  Derivation,
  Future,
  FutureState,
  OptionsForMakingAStore,
  Readable,
} from 'olik';

type SvelteStore<T> = { subscribe: (run: (value: T) => any, invalidate?: any) => any }

declare module 'olik' {
  interface Readable<S> {
    observe: () => SvelteStore<S>;
  }
  interface Derivation<R> {
    observe: () => SvelteStore<R>;
  }
  interface Future<C> {
    observe: (fetchImmediately: boolean) => SvelteStore<FutureState<C>> & ({ get: () => void });
  }
}

type Callback<T> = (arg: DeepReadonly<T>) => void;

export const augmentOlikForSvelte = () => {
  augment({
    selection: {
      observe: <S>(input: Readable<S>) => () => ({
        subscribe: (callback: Callback<S>) => {
          callback(input.state);
          const sub = input.onChange(v => callback(v));
          return () => sub.unsubscribe();
        }
      }),
    },
    derivation: {
      observe: <C>(input: Derivation<C>) => () => ({
        subscribe: (callback: Callback<C>) => {
          callback(input.state);
          const sub = input.onChange(v => callback(v));
          return () => sub.unsubscribe();
        }
      }),
    },
    future: {
      observe: <C>(input: Future<C>) => (fetchImmediately: boolean) => {
        let running = fetchImmediately;
        let callback: Callback<FutureState<C>>;
        const updateState = () => {
          callback(input.state)
          running = false;
        }
        const get = () => {
          input
            .then(() => updateState())
            .catch(() => updateState());
          // We are re-using the same ref, so we must manually reset its state to help with re-fetches
          callback({ ...input.state, isLoading: true });
        }
        return {
          subscribe: (cb: Callback<FutureState<C>>) => {
            callback = cb;
            callback(input.state);
            if (fetchImmediately) { get(); }
            return () => running = false;
          },
          get,
        }
      }
    }
  })
}

export function createStore<S>(args: OptionsForMakingAStore<S>) {
  const store = createStoreCore(args);
  return new Proxy<any>(store, {
    get: (target, prop) => {
      if (prop === 'subscribe') {
        return (callback: Callback<S>) => {
          callback(store.state);
          const sub = store.onChange(v => callback(v));
          return () => sub.unsubscribe();
        }
      }
      return target[prop];
    }
  }) as SvelteStore<DeepReadonly<S>> & typeof store;
}