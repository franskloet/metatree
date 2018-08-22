import Config from "../../components/generic/Config/Config";
import CreateWebdavClient from "webdav";

// Ensure that the window fetch method is used for webdav calls
// and that is passes along the credentials
const defaultOptions = { credentials: 'same-origin' };
CreateWebdavClient.setFetchMethod((input, init) => {
    const options = init ? Object.assign({}, init, defaultOptions) : defaultOptions;

    return fetch(input, options);
})

/**
 * Service to perform file operations
 */
class FileStore {
    static changeHeaders = new Headers({'Content-Type': 'application/json'});
    static getHeaders = new Headers({'Accept': 'application/json'});

    constructor(collectionSubDirectory) {
        this.basePath = '/' + collectionSubDirectory;

        const baseUrl = Config.get().urls.files;
        this.client = CreateWebdavClient(baseUrl)
    }

    list(path) {
        const fullPath = this.getFullPath(path);

        return this.client
            .getDirectoryContents(fullPath)
            .catch(e => {
                // If the root directory does not exist, create it
                if(!path && e.status === 404) {
                    console.info("Root directory for collection does not exist. Creating it.")
                    return this.client.createDirectory(fullPath).then(() => [])
                } else {
                    throw e;
                }
            });
    }

    upload(path, files) {
        if(!files) {
            return;
        }

        const fullPath = this.getFullPath(path);

        return Promise.all(
            files.map(file =>
                this.client.putFileContents(fullPath + '/' + file.name, file))
        );
    }

    download(path) {
        if(!path) {
            return;
        }

        window.location.href = this.client.getFileDownloadLink(this.getFullPath(path));
    }

    /**
     * Converts the path within a collection to a path with the base path
     * @param path
     * @returns {string|*}
     */
    getFullPath(path) {
        return path ? this.basePath + path : this.basePath;
    }

}

export default FileStore;