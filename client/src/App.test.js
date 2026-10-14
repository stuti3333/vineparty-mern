import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import App from './App';

const mockH = {};
const mockOut = [];
const mockSock = {
  connected: true,
  on(e, f) {
    mockH[e] = f;
    return mockSock;
  },
  emit(e, p) {
    mockOut.push([e, p]);
  },
  close() {},
};
jest.mock('socket.io-client', () => ({ io: () => mockSock }));
jest.mock('./components/Boot', () => ({
  __esModule: true,
  default: () => null,
}));

global.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = () => {};
Element.prototype.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};
window.matchMedia =
  window.matchMedia ||
  (() => ({ matches: false, addListener() {}, removeListener() {} }));
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};
global.fetch = (u) =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve(
        String(u).includes('/api/health')
          ? { ok: true }
          : { exists: true, lan: [] },
      ),
  });
jest.spyOn(console, 'error').mockImplementation(() => {});

const setVal = (el, v) => {
  const d = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value');
  d.set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
};
const click = (el) =>
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
let root, host;
beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

test('intro → home → discover filters → room flow', async () => {
  await act(async () => {
    root.render(<App />);
  });
  expect(host.querySelector('#intro')).not.toBeNull();
  expect(host.querySelector('#sA img').getAttribute('src')).toBe(
    '/img/lobby.jpg',
  );
  expect(host.querySelector('#gr').textContent).toBe('Best timepass');
  expect(host.querySelectorAll('.plate').length).toBe(6);
  click(host.querySelector('#enter'));

  expect(host.querySelector('#ht').textContent).toBe('Iron Man');
  expect(host.querySelectorAll('.th').length).toBe(11);
  expect(host.querySelectorAll('#disc .card').length).toBe(11);
  expect(
    [...host.querySelectorAll('img')].every(
      (i) => i.getAttribute('alt') !== null,
    ),
  ).toBe(true);
  const search = host.querySelector('#disc input[type=search]');
  act(() => setVal(search, 'marvle'));
  expect(host.querySelectorAll('#disc .card').length).toBeGreaterThanOrEqual(6);
  act(() => setVal(search, ''));
  click(
    [...host.querySelectorAll('#disc .chip')].find(
      (c) => c.textContent === 'Horror',
    ),
  );
  expect(host.querySelectorAll('#disc .card').length).toBe(1);
  click(
    [...host.querySelectorAll('#disc .chip')].find(
      (c) => c.textContent === 'All',
    ),
  );

  click(host.querySelector('#disc .card'));
  expect(host.querySelector('dialog.side[open] h3').textContent).toBe(
    'Iron Man',
  );

  act(() => {
    host.querySelector('dialog.side').dispatchEvent(new Event('close'));
  });
  const name = host.querySelector('#lobby input');
  act(() => setVal(name, 'Stuti'));
  click(
    [...host.querySelectorAll('#lobby button')].find(
      (b) => b.textContent === 'Create room',
    ),
  );
  expect(host.querySelector('#room')).not.toBeNull();
  act(() => mockH.connect());
  const join = mockOut.find((o) => o[0] === 'join')[1];
  expect(join.create).toBe(true);
  expect(join.name).toBe('Stuti');
  expect(join.id).toBeTruthy();

  const me = join.id;
  act(() =>
    mockH.state({
      first: true,
      seq: 1,
      playing: false,
      pos: 0,
      at: Date.now(),
      idx: 0,
      host: me,
      polls: [],
      chat: [{ id: 1, name: 'Ava', text: 'hi' }],
      heat: [],
      users: [
        { id: me, name: 'Stuti', on: true },
        { id: 'b', name: 'Ava', on: true },
      ],
      playlist: [
        {
          id: 1,
          title: 'Iron Man',
          src: 'http://x/a.mp4',
          pid: 'im',
          by: 'Stuti',
        },
      ],
    }),
  );
  expect(host.querySelector('.stat').textContent).toContain('live');
  expect(host.querySelector('.np h3').textContent).toBe('Iron Man');
  expect(host.querySelectorAll('.av span').length).toBe(2);
  expect(host.querySelector('.msg p').textContent).toBe('hi');

  click(host.querySelector('.ctl button'));
  const ctl = mockOut.filter((o) => o[0] === 'ctl').pop()[1];
  expect(ctl.act).toBe('play');
  expect(typeof ctl._t).toBe('number');
  click([...host.querySelectorAll('.rx button')][2]);
  expect(mockOut.filter((o) => o[0] === 'react').pop()[1].e).toBe('🔥');
  click(
    [...host.querySelectorAll('.tabs button')].find(
      (b) => b.textContent === 'QUEUE',
    ),
  );
  click(host.querySelector('.li button'));
  expect(mockOut.filter((o) => o[0] === 'ctl').pop()[1]).toMatchObject({
    act: 'jump',
    i: 0,
  });
});
