export const counter = {
    value: 0,
    reset() {
        this.value = 0;
    },
    next() {
        return ++this.value;
    },
};
