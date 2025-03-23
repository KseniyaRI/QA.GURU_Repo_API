import { test, expect } from '@playwright/test';
import { URL_API } from '../sources/constURL/constURL.js';
import { expectMandatoryHeaders, expectTodoResponse } from '../sources/helpers/mandatoryFields.builder.js';
import { TodoBuilder, fakeToken } from '../sources/helpers/todo.builder.js';

test.describe('API challenge', () => {
    let token;
    // 01. запрос на получение токена для всех тестов
    test.beforeAll('@01 POST /challenger (201)', async ({ request }) => {
        const response = await request.post(`${URL_API}challenger`);
        const headers = response.headers();
        token = headers["x-challenger"];
        console.log(token);
    });

    // 02. получаем список челленджей
    test('@02 GET /challenges (200)', async ({ request }) => {
        const response = await request.get(`${URL_API}challenges`, {
            headers: {
                "x-challenger": token
            },
        });
        const body = await response.json();
        expect(response.status()).toBe(200);
        expect(body.challenges.length).toBe(59);
    });

    // 03. получаем список todos
    test('@03 GET /todos (200)', async ({ request }) => {
        const response = await request.get(`${URL_API}todos`, {
            headers: {
                "x-challenger": token
            },
        });
        const body = await response.json();
        expect(response.status()).toBe(200);
        expect(body.todos.length).toBe(10);
    });

    // 04. получаем ошибку 404 при запросе /todo (not plural)
    test('@04 GET /todo (404) not plural', async ({ request }) => {
        const response = await request.get(`${URL_API}todo`, {
            headers: {
                "x-challenger": token
            },
        });
        expect(response.status()).toBe(404);
    });

    // 05. получаем todo по id (в примере id = 2)
    test('@05 GET /todos/{2} (200)', async ({ request }) => {
        const response = await request.get(`${URL_API}todos/2`, {
            headers: {
                "x-challenger": token
            },
        });
        const body = await response.json();
        expect(response.status()).toBe(200);
        expect(body.todos).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ title: "file paperwork" })
            ])
        );
    });

    // 06. получаем ошибку 404 при запросе todo с несуществующим id (в примере id = 222)
    test('@06 GET /todos/222 (404)', async ({ request }) => {
        const response = await request.get(`${URL_API}todos/222`, {
            headers: {
                "x-challenger": token
            },
        });
        expect(response.status()).toBe(404);
    });

    // 07. получаем отфильтрованный список todos по статусу done (doneStatus == true)
    test('@07 GET /todos (200) ?filter', async ({ request }) => {
        // запрашиваем список todos, чтобы убедиться, что в нем присутствуют и выполненные, и невыполненные задачи
       const response = await request.get(`${URL_API}todos`, {
            headers: {
                "x-challenger": token
            },
        });
        const body = await response.json();

        // создаем константу, которая проверяет, есть ли хотя бы одна задача с doneStatus === true
        const hasStatusTrue = body.todos.some(todo => todo.doneStatus === true);
        if (!hasStatusTrue) {
        // если в списке нет ни одной задачи с doneStatus === true, делаем POST запрос на создание задачи с doneStatus === true
            const newDoneTodo = new TodoBuilder()
                .addTitle()
                .addDoneStatus() // в билдере для удобства уже установлен doneStatus === true
                .addDescription()
                .generateTodo();
            const postResponse = await request.post(`${URL_API}todos`, {
                headers: {
                    "x-challenger": token
                },
                data: newDoneTodo
            });
            expect(postResponse.status()).toBe(201);
        }     
            // запрашиваем список todos с параметром doneStatus=true
            const filteredPostResponse = await request.get(`${URL_API}todos?doneStatus=true`, {
                headers: {
                    "x-challenger": token
                }
            });
            const filteredPostBody = await filteredPostResponse.json();
            // проверяем, что все задачи в отфильтрованном списке имеют doneStatus === true
            filteredPostBody.todos.forEach(todo => {
                expect(todo.doneStatus).toBe(true);
            });
        });

    // 08. получаем список заголовков todo
    test('@08 HEAD /todos (200)', async ({ request }) => {
        const response = await request.head(`${URL_API}todos`, {
            headers: {
                "x-challenger": token
            },
        });
        const headers = response.headers();
        expect(response.status()).toBe(200);
        // Проверяем, что среди полученных заголовков присутствуют все обязательные (connection, date, content-type, x-challenger, server, via)
        expectMandatoryHeaders(headers);
        });

    // 09. создаем новый todo
    test('@09 POST /todos (201)', async ({ request }) => {
        const todo = new TodoBuilder()
            .addTitle()
            .addDoneStatus()
            .addDescription()
            .generateTodo();

        const response = await request.post(`${URL_API}todos`, {
            headers: {
                "x-challenger": token
            },
            data: todo
        });
        
        const body = await response.json();
        expect(response.status()).toBe(201);
        expectTodoResponse(body, todo);
        
        // перезапрашиваем обновленный список todos, чтобы проверить, что созданный todo присутствует в списке всех todo по id
        const updatedTodosResponse = await request.get(`${URL_API}todos`, {
            headers: {
                "x-challenger": token
            }
        });
        const updatedTodosBody = await updatedTodosResponse.json();
        // Проверяем, что созданный todo присутствует в списке всех todo по id
        expect(updatedTodosBody.todos).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: body.id })
        ]));
    });

    // 10. получаем ошибку 404 при попытке создать todo с doneStatus в некорректном формате (!=boolean)
    test('@10 POST /todos (400) doneStatus', async ({ request }) => {
        const todo = new TodoBuilder()
            .addTitle()
            .addDescription()
            .generateTodo();

        const response = await request.post(`${URL_API}todos`, {
            headers: {
                "x-challenger": token
            },
            data: {
                ...todo,
                doneStatus: 34
            }
        });
        const body = await response.json();
        expect(response.status()).toBe(400);
        expect(body.errorMessages).toContain('Failed Validation: doneStatus should be BOOLEAN but was NUMERIC');
    });

    // 11. получаем ошибку 404 при попытке создать todo с title > чем максимальное значение (50 символов)
    test('@11 POST /todos (400) title too long', async ({ request }) => {
        const todo = new TodoBuilder()
            .addDoneStatus()
            .addDescription()
            .generateTodo();

        const response = await request.post(`${URL_API}todos`, {
            headers: {
                "x-challenger": token
            },
            data: {
                ...todo,
                title: "A".repeat(51)
            }
        });
        const body = await response.json();
        expect(response.status()).toBe(400);
        expect(body.errorMessages).toContain('Failed Validation: Maximum allowable length exceeded for title - maximum allowed is 50');
    });

    // 12. получаем ошибку 404 при попытке создать todo с description > чем максимальное значение (200 символов)
    test('@12 POST /todos (400) description too long', async ({ request }) => {
        const todo = new TodoBuilder()
            .addTitle()
            .addDoneStatus()
            .generateTodo();

        const response = await request.post(`${URL_API}todos`, {
            headers: {
                "x-challenger": token
            },
            data: {
                ...todo,
                description: "A".repeat(201)
            }
        });
        const body = await response.json();
        expect(response.status()).toBe(400);
        expect(body.errorMessages).toContain('Failed Validation: Maximum allowable length exceeded for description - maximum allowed is 200');
    });

    // 13. создаем todo с максимальным значением title/description
    test('@13 POST /todos (201) max out content-length', async ({ request }) => {
        const todo = new TodoBuilder()
            .addDoneStatus()
            .generateTodo();

        const response = await request.post(`${URL_API}todos`, {
            headers: {
                "x-challenger": token
            },
            data: {
                ...todo,
                title: "A".repeat(50),
                description: "A".repeat(200)
            }
        });
        const body = await response.json();
        expect(response.status()).toBe(201);
        expect(body.title).toBe("A".repeat(50));
        expect(body.description).toBe("A".repeat(200));
    });

    // 14. получаем ошибку 413 при попытке создать todo с превышением допустимой длины контекста
    test('@14 POST /todos (413) content too long', async ({ request }) => {
        const todo = new TodoBuilder()
            .addTitle()
            .addDoneStatus()
            .generateTodo();

        const response = await request.post(`${URL_API}todos`, {
            headers: {
                "x-challenger": token
            },
            data: {
                ...todo,
                description: "A".repeat(5000)
            }
        });
        const body = await response.json();
        expect(response.status()).toBe(413);
        expect(body.errorMessages).toContain('Error: Request body too large, max allowed is 5000 bytes');
    });

    // 15. 	получаем ошибку 400 при попытке создать todo с "лишним" полем
    test('@15 POST /todos (400) extra fields', async ({ request }) => {
        const todo = new TodoBuilder()
            .addTitle()
            .addDoneStatus()
            .addDescription()
            .generateTodo();

        const response = await request.post(`${URL_API}todos`, {
            headers: {
                "x-challenger": token
            },
            data: {
                ...todo,
                extraField: "extraField"
            }
        });
        const body = await response.json();
        expect(response.status()).toBe(400);
        expect(body.errorMessages).toContain('Could not find field: extraField');
    });

    // 16. получаем ошибку 400 при попытке создать todo с указанием id в URL
    test('@16 PUT /todos/{id} (400)', async ({ request }) => {
        const todo = new TodoBuilder()
            .addTitle()
            .addDoneStatus() 
            .addDescription()
            .generateTodo();

        const response = await request.put(`${URL_API}todos/999`, {
            headers: {
                "x-challenger": token
            },
            data: todo
        });
        const body = await response.json();
        expect(response.status()).toBe(400);
        expect(body.errorMessages).toContain('Cannot create todo with PUT due to Auto fields id');
    });

    // 17. меняем значение любого заголовка в уже существующем todo (в примере description) через POST запрос
    test('@17 POST /todos/1 (200)', async ({ request }) => {
        const response = await request.post(`${URL_API}todos/1`, {
            headers: {
                "x-challenger": token
            },
            data: {
                description: "A".repeat(20)
            }
        });
        const body = await response.json();
        expect(response.status()).toBe(200);
        expect(body.description).toBe("A".repeat(20));
    });

    // 18. получаем ошибку 404 при попытке изменить значение заголовка в todo, вводя несуществующий id (в примере id = 999)
    test('@18 POST /todos/999 (404)', async ({ request }) => {
        const response = await request.post(`${URL_API}todos/999`, {
            headers: {
                "x-challenger": token
            },
            data: {
                description: "A".repeat(20)
            }
        });
        const body = await response.json();
        expect(response.status()).toBe(404);
        expect(body.errorMessages).toContain('No such todo entity instance with id == 999 found');
    });

    // 19. меняем значение всех заголовков todo (put запрос с указанием всех полей)
    test('@19 PUT /todos/1 (200)', async ({ request }) => {
        const todo = new TodoBuilder()
            .addTitle()
            .addDoneStatus()
            .addDescription()
            .generateTodo();

        const response = await request.put(`${URL_API}todos/1`, {
            headers: {
                "x-challenger": token
            },
            data: todo
        });
        const body = await response.json();
        expect(response.status()).toBe(200);
        expectTodoResponse(body, todo);
        
        // перезапрашиваем обновленный список todos, чтобы проверить, что обновленный todo присутствует в списке всех todo по id (id из ответа на PUT запроc: 1)
        const updatedTodosResponse = await request.get(`${URL_API}todos`, {
            headers: {
                "x-challenger": token
            }
        });
        const updatedTodosBody = await updatedTodosResponse.json();
        // проверяем, что обновленный todo присутствует в списке всех todo по id
        expect(updatedTodosBody.todos).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: body.id })
        ]));
    });

    // 20. меняем значение любого заголовка в уже существующем todo (в примере description) через PUT запрос
    test('@20 PUT /todos/2 (200)', async ({ request }) => {
        const response = await request.put(`${URL_API}todos/2`, {
            headers: {
                "x-challenger": token
            },
            data: {
                title: "updated title"
            }
        });
        const body = await response.json();
        expect(response.status()).toBe(200);
        expect(body.title).toBe("updated title");
    });

    // 21. получаем ошибку 400 при попытке обновить данные todo без обязательного заголовка (в примере – без title)
    test('@21 PUT /todos/1 (400) no title', async ({ request }) => {
        const response = await request.put(`${URL_API}todos/1`, {
            headers: {
                "x-challenger": token
            },
            data: {
                doneStatus: true
            }
        });
        const body = await response.json();
        expect(response.status()).toBe(400);
        expect(body.errorMessages).toContain('title : field is mandatory');
    });

    // 22. получаем ошибку 400 при попытке обновить данные todo, изменяя id (в примере – id = 999)
    test('@22 PUT /todos/1 (400) no amend id', async ({ request }) => {
        const response = await request.put(`${URL_API}todos/1`, {
            headers: {
                "x-challenger": token
            },
            data: {
                id: 999,
                title: "updated title",
                doneStatus: true,
                description: "updated description"
            }
        });
        const body = await response.json();
        expect(response.status()).toBe(400);
        expect(body.errorMessages).toContain('Can not amend id from 1 to 999');
    });

    // 23. удаляем существующий todo (в примере – id = 1)
    test('@23 DELETE /todos/1 (200)', async ({ request }) => {
        const response = await request.get(`${URL_API}todos`, {
            headers: {
                "x-challenger": token
            },
        });
        const body = await response.json();
        expect(response.status()).toBe(200);
        expect(body.todos).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ id: 1 })
            ])
        );
    
        const deleteResponse = await request.delete(`${URL_API}todos/1`, {
            headers: {
                "x-challenger": token
            },
        });
        expect(deleteResponse.status()).toBe(200);

        const deletedTodoResponse = await request.get(`${URL_API}todos/1`, {
            headers: {
                "x-challenger": token
            },
        });
        expect(deletedTodoResponse.status()).toBe(404);
    });

    // 24. получаем список доступных методов для работы с todos
    test('@24 OPTIONS /todos (200)', async ({ request }) => {
        const response = await request.fetch(`${URL_API}todos`, {
            headers: {
                "x-challenger": token
            },
            method: 'OPTIONS'
        });
        const headers = response.headers();
        expect(response.status()).toBe(200);
        expect(headers['allow']).toBeDefined();
    });

    // 25. получаем список todos в формате XML (указываем заголовок `Accept` со значением `application/xml`)
    test('@25 GET /todos (200) XML', async ({ request }) => {
        const response = await request.get(`${URL_API}todos`, {
            headers: {
                "x-challenger": token,
                "Accept": "application/xml"
            },
        });
        const body = await response.text();
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('application/xml');
        expect(body).toContain('</todos>');
    }); 

    // 26. получаем список todos в формате JSON (указываем заголовок `Accept` со значением `application/json`)
    test('@26 GET /todos (200) JSON', async ({ request }) => {
        const response = await request.get(`${URL_API}todos`, {
            headers: {
                "x-challenger": token,
                "Accept": "application/json"
            },
        });
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('application/json');
    });
    
    // 27. получаем список todos в формате JSON по умолчанию (указываем заголовок `Accept` со значением `*/*`)
    test('@27 GET /todos (200) ANY', async ({ request }) => {
        const response = await request.get(`${URL_API}todos`, {
            headers: {
                "x-challenger": token,
                "Accept": "*/*"
            },
        });
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('application/json');
    });

    // 28. получаем список todos в формате XML (указываем заголовок `Accept` со значением `application/xml, application/json`)
    test('@28 GET /todos (200) XML preferred', async ({ request }) => {
        const response = await request.get(`${URL_API}todos`, {
            headers: {
                "x-challenger": token,
                "Accept": "application/xml, application/json"
            },
        });
        const body = await response.text();
        expect(body).toContain('</todos>');
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('application/xml');
    });

    // 29. получаем список todos в формате JSON по умолчанию (не указываем заголовок `Accept`)
    test('@29 GET /todos (200) no accept', async ({ request }) => {
        const response = await request.get(`${URL_API}todos`, {
            headers: {  
                "x-challenger": token
            },
        });
        const body = await response.json();
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('application/json');
    });

    // 30. получаем ошибку 406 при попытке получить список todos в некорректном формате (указываем заголовок `Accept` со значением `application/gzip`)	
    test('@30 GET /todos (406)', async ({ request }) => {
        const response = await request.get(`${URL_API}todos`, {
            headers: {
                "x-challenger": token,
                "Accept": "application/gzip"
            },
        });
        const body = await response.json();
        expect(response.status()).toBe(406);
        expect(body.errorMessages).toContain('Unrecognised Accept Type');
    });

    // 31. создаем todo в формате XML
    test('@31 POST /todos XML', async ({ request }) => {
        const response = await request.post(`${URL_API}todos`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/xml",
                "Accept": "application/xml"
            },
            data: `<todo>
                <title>xml title</title>
                <doneStatus>true</doneStatus>
            </todo>`
        });

        const body = await response.text();
        expect(response.status()).toBe(201);
        expect(response.headers()['content-type']).toContain('application/xml');
        expect(body).toContain('<title>xml title</title>');
        expect(body).toContain('<doneStatus>true</doneStatus>');

        // проверяем, что в ответе есть созданный todo
        const updatedTodosResponse = await request.get(`${URL_API}todos`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/xml",
                "Accept": "application/xml"
            },
        });
        const updatedTodosBody = await updatedTodosResponse.text();
        expect(updatedTodosBody).toContain('<title>xml title</title>');
    });
    
    // 32. создаем todo в формате JSON
    test('@32 POST /todos JSON', async ({ request }) => {
        const response = await request.post(`${URL_API}todos`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            data: {
                title: "json title",
                doneStatus: true
            }
        });
        const body = await response.json();
        expect(response.status()).toBe(201);
        expect(response.headers()['content-type']).toContain('application/json');
        expect(body.title).toBe("json title");
        expect(body.doneStatus).toBe(true);

        // проверяем, что в ответе есть созданный todo
        const updatedTodosResponse = await request.get(`${URL_API}todos`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
        });
        const updatedTodosBody = await updatedTodosResponse.json();
        expect(updatedTodosBody.todos).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ title: "json title" })]));
    });

    // 33. получаем ошибку 415 при попытке создать todo в некорректном формате (Content-Type: unknown/unknown)
    test('@33 POST /todos (415)', async ({ request }) => {
        const response = await request.post(`${URL_API}todos`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "unknown/unknown",
                "Accept": "application/json"
            },
            data: {
                title: "json title",
                doneStatus: true
            }
        });
        const body = await response.json();
        expect(response.status()).toBe(415);
        expect(body.errorMessages).toContain(`Unsupported Content Type - unknown/unknown`);
    });

    // 34. получаем данные о существующем прогрессе челленджа
    test('@34 GET /challenger/{guid} (existing X-CHALLENGER)', async ({ request }) => {
        const response = await request.get(`${URL_API}challenger/${token}`, {
            headers: {
                "x-challenger": token
            },
        });
        const body = await response.json();
        expect(response.status()).toBe(200);
        expect(body.xChallenger).toBe(token);
        expect(body).toHaveProperty('challengeStatus');
    });
    
    // 35. восстанавливаем прогресс челленджа
    test('@35 PUT /challenger/guid RESTORE', async ({ request }) => {
        // получаем текущий прогресс
        const progressResponse = await request.get(`${URL_API}challenger/${token}`, {
            headers: {
                "x-challenger": token
            }
        });
        const progressData = await progressResponse.json();

        // восстанавливаем прогресс
        const restoreResponse = await request.put(`${URL_API}challenger/${token}`, {
            headers: {
                "x-challenger": token,
            },
            data: progressData
        });
        const restoreBody = await restoreResponse.json();

        expect(restoreResponse.status()).toBe(200);
        expect(restoreBody.xChallenger).toBe(token);
        expect(restoreBody.challengeStatus.GET_RESTORABLE_CHALLENGER_PROGRESS_STATUS).toBe(true);
    });

    // 36. получаем существующий прогресс и помещаем его в новый токен
    test('@36 PUT /challenger/guid CREATE', async ({ request }) => {
        // получаем данные по прогрессу
        const progressResponse = await request.get(`${URL_API}challenger/${token}`, {
            headers: {
                "x-challenger": token
            }
        });
        const progressData = await progressResponse.json();

        // прописываем новый токен
        const newToken = new fakeToken().getToken();

        // меняем xChallenger на новый токен
        progressData.xChallenger = newToken;
        console.log(progressData.xChallenger);
       
        // отправляем запрос на восстановление прогресса
       const response = await request.put(`${URL_API}challenger/${newToken}`, {
            headers: {
                "x-challenger": newToken,
            },
            data: progressData
        });
        expect(response.status()).toBe(201);

        // проверяем, что прогресс восстановился
        const updatedProgressResponse = await request.get(`${URL_API}challenger/${newToken}`, {
            headers: {
                "x-challenger": newToken
            }
        });
        const updatedProgressData = await updatedProgressResponse.json();   
        expect(updatedProgressData.xChallenger).toBe(newToken);
    });

    // 37. получаем текущий прогресс по работе с todos
    test('@37 GET /challenger/database/{guid} (200)', async ({ request }) => {
        const response = await request.get(`${URL_API}challenger/database/${token}`, {
            headers: {
                "x-challenger": token
            },
        });
        const todosFromDatabase = await response.json();
        expect(response.status()).toBe(200);
        expect(todosFromDatabase.todos.length).toBeGreaterThan(10);
    });

    // 38. обновляем текущий прогресс по работе с todos
    test('@38 PUT /challenger/database/{guid} (Update)', async ({ request }) => {
        const databaseResponse = await request.get(`${URL_API}challenger/database/${token}`, {
            headers: {
                "x-challenger": token
            }
        });
        const databaseData = await databaseResponse.json();

        const response = await request.put(`${URL_API}challenger/database/${token}`, {
            headers: {
                "x-challenger": token
            },
            data: databaseData
        });
        expect(response.status()).toBe(204);

        // проверяем, что данные в базе обновились
        const updatedDatabaseResponse = await request.get(`${URL_API}todos`, {
            headers: {
                "x-challenger": token
            }
        });
        const updatedDatabaseData = await updatedDatabaseResponse.json();
        expect(updatedDatabaseData.todos.length).toEqual(databaseData.todos.length);
    });

    // 39. создаем todo в формате XML, получаем ответ в формате JSON
    test('@39 POST /todos XML to JSON', async ({ request }) => {
        const response = await request.post(`${URL_API}todos`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/xml",
                "Accept": "application/json"
            },
            data: `<todo>
                <title>xml title to json</title>
                <doneStatus>true</doneStatus>
            </todo>`
        });
        const body = await response.json();
        expect(response.status()).toBe(201);
        expect(body.title).toBe("xml title to json");
        expect(body.doneStatus).toBe(true);
    });

    // 40. создаем todo в формате JSON, получаем ответ в формате XML
    test('@40 POST /todos JSON to XML', async ({ request }) => {
        const response = await request.post(`${URL_API}todos`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json",
                "Accept": "application/xml"
            },
            data: {
                title: "json title to xml",
                doneStatus: true
            }
        });
        const body = await response.text();
        expect(response.status()).toBe(201);
        expect(response.headers()['content-type']).toContain('application/xml');
        expect(body).toContain('<title>json title to xml</title>');
        expect(body).toContain('<doneStatus>true</doneStatus>');
    });
    
    // 41. получаем ошибку 405 при попытке удалить heartbeat (Method Not Allowed)
    test('@41 DELETE /heartbeat (405)', async ({ request }) => {
        const response = await request.delete(`${URL_API}heartbeat`, {
            headers: {
                "x-challenger": token
            }
        });
        expect(response.status()).toBe(405);
    });    

    // 42. получаем ошибку 500 при попытке изменить heartbeat (Internal Server Error)
    test('@42 PATCH /heartbeat (500)', async ({ request }) => {
        const response = await request.patch(`${URL_API}heartbeat`, {
            headers: {
                "x-challenger": token
            }
        });
        expect(response.status()).toBe(500);
    });

    // 43. получаем ошибку 501 при попытке использовать метод TRACE для heartbeat (Not Implemented)
    test('@43 TRACE /heartbeat (501)', async ({ request }) => {
        const response = await request.fetch(`${URL_API}heartbeat`, {
            headers: {
                "x-challenger": token
            },
            method: "TRACE"
        });
        expect(response.status()).toBe(501);
    });

    // 44. запрашиваем heartbeat, когда сервер запущен
    test('@44 GET /heartbeat (204)', async ({ request }) => {
        const response = await request.get(`${URL_API}heartbeat`, {
            headers: {
                "x-challenger": token
            }
        });
        expect(response.status()).toBe(204);
    });

    // 45. отправляем DELETE запрос для heartbeat, используя POST
    test('@45 POST /heartbeat as DELETE (405)', async ({ request }) => {
        const response = await request.post(`${URL_API}heartbeat`, {
            headers: {
                "x-challenger": token,
                "X-HTTP-Method-Override": "DELETE"
            }
        });
        expect(response.status()).toBe(405);
    });

    // 46. отправляем PATCH запрос для heartbeat, используя POST
    test('@46 POST /heartbeat as PATCH (500)', async ({ request }) => {
        const response = await request.post(`${URL_API}heartbeat`, {
            headers: {
                "x-challenger": token,
                "X-HTTP-Method-Override": "PATCH"
            }
        });
        expect(response.status()).toBe(500);
    });

    // 47. отправляем TRACE запрос для heartbeat, используя POST
    test('@47 POST /heartbeat as Trace (501)', async ({ request }) => {
        const response = await request.post(`${URL_API}heartbeat`, {
            headers: {
                "x-challenger": token,
                "X-HTTP-Method-Override": "TRACE"
            }
        });
        expect(response.status()).toBe(501);
    });

    // 48. получаем ошибку 401 при попытке запроса, когда передано невалидное значение Authorization
    test('@48 POST /secret/token (401)', async ({ request }) => {
        const response = await request.post(`${URL_API}secret/token`, {
            headers: {
                "x-challenger": token,
                Authorization: `Basic ${btoa('noAdmin:noPassword')}`
            }
        });
        expect(response.status()).toBe(401);
        expect(response.headers()).not.toHaveProperty('x-auth-token');
    });

    // 49. создаем POST запрос для /secret/token с валидным значение Authorization
    test('@49 POST /secret/token (201)', async ({ request }) => {
        const response = await request.post(`${URL_API}secret/token`, {
            headers: {
                "x-challenger": token,
                Authorization: `Basic ${btoa('admin:password')}`
            }
        });
        const headers = response.headers();
        expect(response.status()).toBe(201);
        expect(headers).toHaveProperty('x-auth-token');
    });

    // 50. получаем ошибку 403 при попытке запроса, когда передано невалидное значение auth-token
    test('@50 GET /secret/note (403)', async ({ request }) => {
        const response = await request.get(`${URL_API}secret/note`, {
            headers: {
                "x-challenger": token,
                "x-auth-token": "invalid auth-token"
            }
        });
        expect(response.status()).toBe(403);
    });

    // 51. получаем ошибку 401 при попытке запроса без передачи auth-token
    test('@51 GET /secret/note (401)', async ({ request }) => {
        const response = await request.get(`${URL_API}secret/note`, {
            headers: {
                "x-challenger": token
            }
        });
        const headers = response.headers();
        expect(response.status()).toBe(401);
        expect(headers).not.toHaveProperty('x-auth-token');
    });

    // 52. отправляем GET запрос для /secret/note с указанием допустимого auth-token (проверяем, что тело ответа содержит "note")
    test('@52 GET /secret/note (200)', async ({ request }) => {
        const postResponse = await request.post(`${URL_API}secret/token`, {
            headers: {
                "x-challenger": token,
                Authorization: `Basic ${btoa('admin:password')}`
            }
        });
        const xAuthToken = postResponse.headers()["x-auth-token"];
        
        const response = await request.get(`${URL_API}secret/note`, {
            headers: {
                "x-challenger": token,
                "x-auth-token": xAuthToken
            }
        });
        const body = await response.json();
        expect(response.status()).toBe(200);
        expect(body).toHaveProperty('note');
    });

    // 53. отправляем POST запрос для /secret/note с передачей note и указанием валидного значения Authorization
    test('@53 POST /secret/note (200)', async ({ request }) => {
        const postResponse = await request.post(`${URL_API}secret/token`, {
            headers: {
                "x-challenger": token,
                Authorization: `Basic ${btoa('admin:password')}`
            }
        });
        const xAuthToken = postResponse.headers()["x-auth-token"];
        
        const response = await request.post(`${URL_API}secret/note`, {
            headers: {
                "x-challenger": token,
                "x-auth-token": xAuthToken
            },
            data: {
                "note":"my note"
            }
        });
        const body = await response.json();
        expect(response.status()).toBe(200);
        expect(body.note).toBe("my note");
    });

    // 54. отправляем POST запрос для /secret/note с указанием валидного значения x-challenger, но без указания значения Authorization
    test('@54 POST /secret/note (401)', async ({ request }) => {
        const response = await request.post(`${URL_API}secret/note`, {
            headers: {
                "x-challenger": token
            },
            data: {
                "note":"my note"
            }
        });
        expect(response.status()).toBe(401);
    });

    // 55. отправляем POST запрос для /secret/note с указанием валидного значения x-challenger, но с указанием невалидного значения x-auth-token
    test('@55 POST /secret/note (403)', async ({ request }) => {
        const response = await request.post(`${URL_API}secret/note`, {
            headers: {
                "x-challenger": token,
                "x-auth-token": "invalid auth-token"
            },
            data: {
                "note":"my note"
            }
        });
        expect(response.status()).toBe(403);
    });

    // 56. отправляем GET запрос для /secret/note с указанием валидного значения x-challenger и x-auth-token
    test('@56 GET /secret/note (Bearer)', async ({ request }) => {
        const responseAuthBearerToken = await request.post(`${URL_API}secret/token`, {
            headers: {
                "x-challenger": token,
                Authorization: `Basic ${btoa('admin:password')}`
            }
        });
        const authBearerToken = responseAuthBearerToken.headers()["x-auth-token"];
        
        const response = await request.get(`${URL_API}secret/note`, {
            headers: {
                "x-challenger": token,
                Authorization: `Bearer ${authBearerToken}`
            }
        });
        const body = await response.json();
        expect(response.status()).toBe(200);
        expect(body).toHaveProperty('note');
    });

    // 57. отправляем POST запрос для /secret/note с указанием валидного значения x-challenger и x-auth-token
    test('@57 POST /secret/note (Bearer)', async ({ request }) => {
        const responseAuthBearerToken = await request.post(`${URL_API}secret/token`, {
            headers: {
                "x-challenger": token,
                Authorization: `Basic ${btoa('admin:password')}`
            }
        });
        const authBearerToken = responseAuthBearerToken.headers()["x-auth-token"];
        
        const response = await request.post(`${URL_API}secret/note`, {
            headers: {
                "x-challenger": token,
                Authorization: `Bearer ${authBearerToken}`
            },
            data: {
                "note":"my note"
            }
        });
        const body = await response.json();
        expect(response.status()).toBe(200);
        expect(body.note).toBe("my note");
    });

    // 58. удаляем все todos
    test('@58 DELETE /todos/{id} (200) all', async ({ request }) => {
        // получаем список всех todos
        const getResponse = await request.get(`${URL_API}todos`, {
            headers: {
                "x-challenger": token
            }
        });
        const body = await getResponse.json();
        
        // удаляем все todos
        for (const todo of body.todos) {
            const deleteResponse = await request.delete(`${URL_API}todos/${todo.id}`, {
                headers: {
                    "x-challenger": token
                }
            });
            expect(deleteResponse.status()).toBe(200);
        }
        
        // проверяем, что в системе не осталось todos
        const checkResponse = await request.get(`${URL_API}todos`, {
            headers: {
                "x-challenger": token
            }
        });
        const checkBody = await checkResponse.json();
        expect(checkBody.todos.length).toBe(0);
    });

    // 59. создаем максимальное количество todos (20)
    test('@59 POST /todos (201) maximum allowed', async ({ request }) => {
        // максимальное количество todos
        const maxCountTodos = 20; 
        
        // сначала получаем список всех существующих todos
        const getTodosResponse = await request.get(`${URL_API}todos`, {
            headers: {
                "x-challenger": token
            }
        });
        const body = await getTodosResponse.json();
        const countTodos = body.todos.length;
        
        // вычисляем, сколько еще нужно создать todos
        const countTodosToCreate = maxCountTodos - countTodos;
    
        // создаем только недостающее количество задач
        for (let i = 0; i < countTodosToCreate; i++) {
            const newTodo = new TodoBuilder()
                .addTitle()
                .addDoneStatus()
                .addDescription()
                .generateTodo();
            
            const response = await request.post(`${URL_API}todos`, {
                headers: {
                    "x-challenger": token
                },
                data: newTodo
            });
        }

        // проверяем, что в системе теперь максимальное количество todos
        const finalGetResponse = await request.get(`${URL_API}todos`, {
            headers: {
                "x-challenger": token
            }
        });
        const finalTodos = await finalGetResponse.json();
        expect(finalTodos.todos.length).toBe(maxCountTodos);

        // пробуем добавить еще одну todo (превышаем лимит) - должна быть ошибка
        const extraTodo = new TodoBuilder()
            .addTitle()
            .addDoneStatus()
            .addDescription()
            .generateTodo();
        
        const extraResponse = await request.post(`${URL_API}todos`, {
            headers: {
                "x-challenger": token
            },
            data: extraTodo
        });
        expect(extraResponse.status()).toBe(400);
    });
});