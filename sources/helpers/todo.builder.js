// создание todo
import { faker } from '@faker-js/faker';

export class TodoBuilder {
    addTitle() {
        this.todoTitle = faker.word.words(3);
        return this;        
    }
    addDoneStatus() {
        this.todoDoneStatus = true;
        return this;
    }
    addDescription() {
        this.todoDescription = faker.lorem.sentence(1);
        return this;        
    }
    generateTodo() {
        return {
            title: this.todoTitle,
            doneStatus: this.todoDoneStatus,
            description: this.todoDescription
        };
    }
}

export class fakeToken {
    constructor() {
        this.token = faker.string.uuid();
    }
    getToken() {
        return this.token;
    }
}

