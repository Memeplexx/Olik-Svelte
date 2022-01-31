import '@testing-library/jest-dom';

import { createStore, importOlikAsyncModule, importOlikNestingModule } from 'olik';

import { augmentOlikForSvelte } from '../src';

describe('Svelte', () => {

  const initialState = {
    object: { property: 'a' },
    array: [{ id: 1, value: 'one' }, { id: 2, value: 'two' }, { id: 3, value: 'three' }],
    string: 'b',
  };

  beforeAll(() => {
    augmentOlikForSvelte();
    importOlikAsyncModule();
    importOlikNestingModule();
  })

  it('should create and update a store', () => {
    const select = createStore({ name: '', state: initialState });
    select.object.property
      .$replace('test');
    expect(select.$state.object.property).toEqual('test');
  })

});
