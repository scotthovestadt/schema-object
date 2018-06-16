interface SchemaObjectInstance<T> {
    populate(values: T): void;
    toObject(): T;
    clone(): SchemaObjectInstance<T>;
    clear(): void;
    getErrors(): Array<{
        errorMessage: string;
        setValue: any;
        originalValue: any;
        fieldSchema: {
            name: string;
            index: string;
        }
        schemaObject: SchemaObjectInstance<T>;
    }>;
    clearErrors(): void;
    isErrors(): boolean;
}

declare module 'schema-object' {

    interface SchemaObject {
        new <T>(schema: { [key in keyof T]: any }, options?: any): {
            new (values?: T): T & SchemaObjectInstance<T>;
        };
    }
    const SO: SchemaObject;
    export = SO;

}
