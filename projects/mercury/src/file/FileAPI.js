import {createClient} from "webdav";
import axios from 'axios';
import {compareBy, comparing} from '../common/utils/genericUtils';

import {generateUniqueFileName, getFileName, joinPaths} from './fileUtils';


// Ensure that the client passes along the credentials
const defaultOptions = {withCredentials: true};

// Keep all item properties
const includeDetails = {...defaultOptions, details: true};

axios.interceptors.request.use((config) => {
    // For stat requests we want to retrieve all available webdav properties
    // We can only distinguish between a directory listing and a stat request
    // based on the Depth header send to the backend.
    if (config.method === 'propfind') {
        config.headers['content-type'] = 'application/xml';
        config.data = `<propfind><allprop /></propfind>`;
    }
    return config;
}, (error) => Promise.reject(error));

export type File = {
    filename: string;
    basename: string;
    lastmod: string;
    size: number;
    type: string;
    dateDeleted?: string;
}

class FileAPI {
    client() {
        return createClient('/api/v1/webdav');
    }

    stat(path, showDeleted) {
        const options = {...includeDetails};
        if (showDeleted) {
            options.headers = {"Show-Deleted": "on"};
        }
        return this.client().stat(path, options)
            .then(result => result.data);
    }

    /**
     * List directory contents
     * @param path        Full path within the collection
     * @param showDeleted Include deleted files and directories in the response
     * @returns {Promise<T>}
     */
    list(path, showDeleted = false): File[] {
        const options = {...includeDetails};
        if (showDeleted) {
            options.headers = {"Show-Deleted": "on"};
        }
        return this.client().getDirectoryContents(path, options)
            .then(result => result.data
                .sort(comparing(compareBy('type'), compareBy('filename')))
                .map(this.mapToFile));
    }

    /**
     * Creates a new directory within the current collection
     * @param path      Full path within the collection
     * @returns {*}
     */
    createDirectory(path) {
        return this.client().createDirectory(path, defaultOptions)
            .catch(e => {
                if (e && e.response) {
                    // eslint-disable-next-line default-case
                    switch (e.response.status) {
                        case 400:
                            throw new Error("Unable to create the given directory. Please check that the name does not contain special characters.");
                        case 403:
                            throw new Error("You do not have authorization to create a directory in this collection.");
                        case 405:
                            throw new Error("A directory or file with this name already exists. Please choose another name");
                    }
                }

                return Promise.reject(e);
            });
    }

    /**
     * Uploads a file
     * @param file
     * @param destinationFilename
     * @param destinationPath
     * @param onUploadProgress
     * @returns {Promise<never>|Promise<any[]>}
     */
    upload({file, destinationFilename, destinationPath}, onUploadProgress = () => {}) {
        if (!file) {
            return Promise.reject(Error("No file given"));
        }

        const requestOptions = {...defaultOptions, onUploadProgress};

        return this.client().putFileContents(`${destinationPath}/${destinationFilename}`, file, requestOptions)
            .catch(e => {
                if (e && e.response) {
                    // eslint-disable-next-line default-case
                    switch (e.response.status) {
                        case 403:
                            throw new Error("You do not have authorization to add files to this collection.");
                    }
                }

                return Promise.reject(e);
            });
    }

    /**
     * It will calls the browser API to open the file if it's 'openable' otherwise the browser will show download dialog
     * @param path
     */
    open(path) {
        const link = this.getDownloadLink(path);
        window.open(link);
    }

    /**
     * It returns a public link where a file can be downloaded.
     */
    getDownloadLink = (path = '') => this.client().getFileDownloadLink(path);

    /**
     * Deletes the file given by path
     * @param path
     * @param showDeleted
     * @returns Promise<any>
     */
    delete(path, showDeleted = false) {
        const options = {...defaultOptions};
        if (showDeleted) {
            options.headers = {"Show-Deleted": "on"};
        }
        if (!path) return Promise.reject(Error("No path specified for deletion"));

        return this.client().deleteFile(path, options)
            .catch(e => {
                if (e && e.response) {
                    // eslint-disable-next-line default-case
                    switch (e.response.status) {
                        case 403:
                            throw new Error("Could not delete file or directory. Only admins can delete them.");
                    }
                }

                return Promise.reject(e);
            });
    }

    /**
     * Restores the file given by path
     * @param path
     * @returns Promise<any>
     */
    restore(path) {
        if (!path) return Promise.reject(Error("No path specified for restoring"));
        const removeDateDeletedPropRequest = ""
            + "<?xml version=\"1.0\"?>"
            + "<d:propertyupdate xmlns:d=\"DAV:\" xmlns:fs=\"http://fairspace.io/ontology#\">"
            + "<d:remove>"
            + "<d:prop>"
            + "<fs:dateDeleted/>"
            + "</d:prop>"
            + "</d:remove>"
            + "</d:propertyupdate>";


        const requestOptions = {
            method: "PROPPATCH",
            headers: {
                "Accept": "text/plain",
                "Content-Type": "text/xml",
                "Show-Deleted": "on"
            },
            responseType: "text",
            data: removeDateDeletedPropRequest
        };

        return this.client().customRequest(path, requestOptions)
            .catch(e => {
                if (e && e.response) {
                    throw new Error("Could not restore file or directory.");
                }

                return Promise.reject(e);
            });
    }

    /**
     * Move the file specified by {source} to {destination}
     * @param source
     * @param destination
     * @returns Promise<any>
     */
    move(source, destination) {
        if (!source) {
            return Promise.reject(Error("No source specified to move"));
        }
        if (!destination) {
            return Promise.reject(Error("No destination specified to move to"));
        }

        if (source === destination) {
            return Promise.resolve();
        }

        // We have to specify the destination ourselves, as the client() adds the fullpath
        // to the
        return this.client().moveFile(source, destination, defaultOptions)
            .catch(e => {
                if (e && e.response) {
                    // eslint-disable-next-line default-case
                    switch (e.response.status) {
                        case 400:
                            throw new Error("Could not move one or more files. Possibly the filename contains special characters.");
                        case 403:
                            throw new Error("Could not move one or more files. Only admins can move files.");
                        case 409:
                            throw new Error("Could not move one or more files. The destination can not be copied to.");
                        case 412:
                            throw new Error("Could not move one or more files. The destination file already exists.");
                    }
                }

                return Promise.reject(e);
            });
    }

    /**
     * Copy the file specified by {source} to {destination}
     * @param source
     * @param destination
     * @returns Promise<any>
     */
    copy(source, destination) {
        if (!source) {
            return Promise.reject(Error("No source specified to copy"));
        }
        if (!destination) {
            return Promise.reject(Error("No destination specified to copy to"));
        }

        return this.client().copyFile(source, destination, defaultOptions)
            .catch(e => {
                if (e && e.response) {
                    // eslint-disable-next-line default-case
                    switch (e.response.status) {
                        case 403:
                            throw new Error("Could not copy one or more files. Do you have write permission to the destination collection?");
                        case 409:
                            throw new Error("Could not copy one or more files. The destination can not be copied to.");
                        case 412:
                            throw new Error("Could not copy one or more files. The destination file already exists.");
                    }
                }

                return Promise.reject(e);
            });
    }

    /**
     * Move one or more files to a destinationdir
     * @param filePaths
     * @param destinationDir
     * @returns {*}
     */
    movePaths(filePaths, destinationDir) {
        return this.uniqueDestinationPaths(filePaths, destinationDir)
            .then(mapping => Promise.all(mapping.map(([src, dst]) => this.move(src, dst))));
    }

    /**
     * Copies one or more files from to a destinationdir
     * @param filePaths
     * @param destinationDir
     * @returns {*}
     */
    copyPaths(filePaths, destinationDir) {
        return this.uniqueDestinationPaths(filePaths, destinationDir)
            .then(mapping => Promise.all(mapping.map(([src, dst]) => this.copy(src, dst))))
            .catch(e => {
                if (e && e.response) {
                    // eslint-disable-next-line default-case
                    switch (e.response.status) {
                        case 403:
                            throw new Error("Could not copy one or more files. Do you have write permission to the destination collection?");
                        case 409:
                            throw new Error("Could not copy one or more files. The destination can not be copied to.");
                        case 412:
                            throw new Error("Could not copy one or more files. The destination file already exists.");
                    }
                }

                return Promise.reject(e);
            });
    }

    /**
     * Generates unique (non-existing) file paths in the destinationdir adding indices to the file names when necessary
     * @param filePaths
     * @param destinationDir
     * @returns {Promise<Array<Array<string>>>} A list of source/destination combinations. The first entry in an array is the source path, the second entry is the associated unique destination path
     */
    uniqueDestinationPaths(filePaths, destinationDir) {
        return this.list(destinationDir)
            .then(files => files.map(f => f.basename))
            .then(usedNames => filePaths.map(sourceFile => {
                const destinationFilename = generateUniqueFileName(getFileName(sourceFile), usedNames);
                usedNames.push(destinationFilename);
                const destinationFile = joinPaths(destinationDir, destinationFilename);
                return [sourceFile, destinationFile];
            }));
    }

    /**
     * Delete one or more files
     * @param filenames
     * @param showDeleted
     * @returns {Promise}
     */
    deleteMultiple(filenames, showDeleted) {
        if (!filenames || filenames.length === 0) {
            return Promise.reject(new Error("No filenames given to delete"));
        }

        return Promise.all(filenames.map(filename => this.delete(filename, showDeleted)));
    }

    restoreMultiple(filenames) {
        if (!filenames || filenames.length === 0) {
            return Promise.reject(new Error("No filenames given to restore"));
        }
        return Promise.all(filenames.map(filename => this.restore(filename)));
    }

    mapToFile: File = (fileObject) => ({
        filename: fileObject.filename,
        basename: fileObject.basename,
        lastmod: fileObject.lastmod,
        size: fileObject.size,
        type: fileObject.type,
        dateDeleted: fileObject.props && fileObject.props.dateDeleted
    })
}

export default new FileAPI();
