const defaultState = {
    type: null,
    sourcedir: null,
    filenames: [],
    pending: false,
    error: false
};

const clipboard = (state = defaultState, action) => {
    switch (action.type) {
        case "CLIPBOARD_CUT":
            return {
                ...state,
                type: 'CUT',
                sourcedir: action.sourcedir,
                filenames: action.filenames
            };
        case "CLIPBOARD_COPY":
            return {
                ...state,
                type: 'COPY',
                sourcedir: action.sourcedir,
                filenames: action.filenames
            };
        case "CLIPBOARD_PASTE_PENDING":
            return {
                ...state,
                pending: true
            };
        case "CLIPBOARD_PASTE_FULFILLED":
        case "CLIPBOARD_CLEAR":
            return {
                ...state,
                pending: false,
                type: null,
                sourcedir: null,
                filenames: []
            };
        case "CLIPBOARD_PASTE_REJECTED":
            return {
                ...state,
                pending: false,
                error: action.payload || true
            };
        default:
            return state;
    }
};

export default clipboard;
