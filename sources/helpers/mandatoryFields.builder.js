import { expect } from '@playwright/test';

export function expectMandatoryHeaders(headers) {
    // Проверяем, что обязательные заголовки присутствуют и имеют непустые значения
    // Обязательными считаю общепринятые и те, которые используются в примере ответа на сайте с заданиями
    expect(headers.connection).toBeTruthy();
    expect(headers.date).toBeTruthy();
    expect(headers['content-type']).toBeTruthy();
    expect(headers['x-challenger']).toBeTruthy();
    expect(headers.server).toBeTruthy();
    expect(headers.via).toBeTruthy();
};

export function expectTodoResponse(body, todo) {
    expect(body.title).toEqual(todo.title);
    expect(body.doneStatus).toBe(todo.doneStatus);
    expect(body.description).toEqual(todo.description);
};