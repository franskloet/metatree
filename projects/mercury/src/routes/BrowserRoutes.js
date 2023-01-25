import React, {useContext} from 'react';
import {Redirect, Route, Switch} from "react-router-dom";

import * as queryString from 'query-string';
import DirectoryPage from "../file/DirectoryPage";
import {MetadataWrapper} from '../metadata/LinkedDataWrapper';
import LinkedDataEntityPage from "../metadata/common/LinkedDataEntityPage";
import LinkedDataMetadataProvider from "../metadata/LinkedDataMetadataProvider";
import CollectionSearchResultList from "../search/SearchResultList";
// FK access to users for superadmin only
import {isSuperadmin} from "../users/userUtils";
import UserContext from "../users/UserContext";
import UserRolesPage from "../users/UserRolesPage";
import MetadataView from '../metadata/views/MetadataView';
import BreadcrumbsContext from '../common/contexts/BreadcrumbsContext';
import ExternalStoragePage from "../external-storage/ExternalStoragePage";
// import UploadDataPage from '../data/UploadData';

const getSubject = () => (
    document.location.search ? queryString.parse(document.location.search).iri : null
);

const BrowserRoutes = () => {
    const {currentUser = {}} = useContext(UserContext);

    return (
        <Switch>
            <Route
                path="/browser/:path(.*)?"
                render={(props) => (
                    <LinkedDataMetadataProvider>
                        <DirectoryPage {...props} />
                    </LinkedDataMetadataProvider>
                )}
            />

            <Route
                path="/text-search"
                render={(props) => (
                    <LinkedDataMetadataProvider>
                        <CollectionSearchResultList {...props} />
                    </LinkedDataMetadataProvider>
                )}
            />

            <Route
                path="/external-storages/:storage"
                render={(props) => (
                    <LinkedDataMetadataProvider>
                        <ExternalStoragePage {...props} />
                    </LinkedDataMetadataProvider>
                )}
            />

            <Route
                path="/metadata-views"
                render={() => (
                    <BreadcrumbsContext.Provider value={{segments: []}}>
                        <LinkedDataMetadataProvider>
                            <MetadataView />
                        </LinkedDataMetadataProvider>
                    </BreadcrumbsContext.Provider>
                )}
            />

            <Route
                path="/metadata"
                exact
                render={() => {
                    const subject = getSubject();
                    if (subject) {
                        return (
                            <MetadataWrapper>
                                <LinkedDataEntityPage title="Metadata" subject={subject} />
                            </MetadataWrapper>
                        );
                    }
                    return null;
                }}
            />

            <Route
                path="/users"
                exact
                render={() => (isSuperadmin(currentUser) && (<UserRolesPage />))}
            />

            <Redirect to="/browser" />
        </Switch>
    );
};

export default BrowserRoutes;
