/* eslint-disable no-unused-vars */
import axios, {CancelTokenSource} from "axios";
import {parse} from 'json2csv';
import {extractJsonData, handleHttpError} from "../../common/utils/httpUtils";
import type {AccessLevel} from "../../users/userUtils";
import {OBJECT_VIEWS} from "./metadataViewUtils";

export type ValueType = 'Identifier' | 'Text' | 'Link' | 'Number' | 'Date' | 'Term' | 'Set' | 'TermSet' | 'Boolean';
export const TextualValueTypes: ValueType[] = ['Identifier', 'Text', 'Set', 'Link'];

export type MetadataViewFilter = {
    field: string;
    values: any[];
    min: any;
    max: any;
    prefix: string;
    booleanValue?: boolean;
}

export type MetadataViewFacetValue = {
    label: string;
    value: string; // iri
    access?: AccessLevel;
};

export type MetadataViewFacet = {
    name: string;
    title: string;
    type: ValueType;
    values: MetadataViewFacetValue[];
    min: any;
    max: any;
    booleanValue?: boolean;
};

export type MetadataViewColumn = {
    name: string;
    title: string;
    type: ValueType;
};

export type MetadataViewOptions = {
    name: string;
    title: string;
    columns: MetadataViewColumn[];
};

export type MetadataViews = {
    views: MetadataViewOptions[];
};

export type MetadataFacets = {
    facets: MetadataViewFacet[];
};

export type MetadataViewData = {
    page: number;
    rows: Map<string, any>[];
    hasNext: boolean;
    timeout: boolean;
};

export type MetadataViewDataCount = {
    count: number;
    timeout: boolean;
};

type MetadataViewCountRequest = {
    view: string;
    filters: MetadataViewFilter[];
};

type MetadataViewDataRequest = MetadataViewCountRequest & {|
    page: number;
    size: number;
    includeJoinedViews: boolean;
|};

const metadataViewUrl = "/api/views/";

const defaultRequestOptions = {
    headers: {Accept: 'application/json'}
};

class MetadataViewAPI {
    getViews(): Promise<MetadataViews> {
        return axios.get(metadataViewUrl, defaultRequestOptions)
            .then(extractJsonData)
            .catch(handleHttpError("Failure when retrieving metadata views."));
    }

    getFacets(): Promise<MetadataFacets> {
        return axios.get(`${metadataViewUrl}facets`, defaultRequestOptions)
            .then(extractJsonData)
            .catch(handleHttpError("Failure when retrieving metadata facets."));
    }

    async getViewExportData(cancelToken: CancelTokenSource, viewName: string, page, size, filters: MetadataViewFilter[] = []): Promise<MetadataViewData> {
        const viewRequest: MetadataViewDataRequest = {
            view: viewName,
            filters,
            page: page + 1, // API endpoint expects 1-base page number
            size,
            includeJoinedViews: true
        };
        const requestOptions = cancelToken ? {...defaultRequestOptions, cancelToken: cancelToken.token} : defaultRequestOptions;

        return axios.post(metadataViewUrl, viewRequest, requestOptions)
            .then(extractJsonData)
            .catch(handleHttpError("Error while fetching export data."));
    }

    async getExportData(viewName: string, filters: MetadataViewFilter[] = [], locationContext:string): Promise<string> {
        const token = axios.CancelToken.source();
        // check if were looking in a contextual enviroment
        const LOCATION_FILTER_FIELD = 'location';
        const locationFilter: MetadataViewFilter = {
            field: LOCATION_FILTER_FIELD,
            values: [locationContext]
        };
        const locFilter = locationContext ? [...filters, locationFilter] : filters;
        // 10_000 rows are downloaded by default .. this is the current limit
        const downloadData = await this.getViewExportData(token, viewName, 0, 10_000, locFilter);
        // rearrange data to only extract the label parts from the json structure
        if (downloadData) {
            const reMapped = Object.keys(downloadData.rows).map(key1 => {
                // create temporary map per row
                const rowMap = new Map();
                Object.keys(downloadData.rows[key1]).forEach(key2 => {
                    Object.keys(downloadData.rows[key1][key2]).forEach(key3 => {
                        const colCheck = key2.indexOf("Assay") !== 0 && key2.indexOf("Object") !== 0;
                        // only assign all values for specific views (similar to the table container)
                        if (OBJECT_VIEWS.includes(viewName) || colCheck) {
                            const values = downloadData.rows[key1][key2][key3].label;
                            rowMap.set(key2, values);
                        }
                    });
                });
                return rowMap;
            });
            // generate json object
            const reMappedArray = reMapped.map(item => Object.fromEntries(item));
            // parse json structures
            const csv = parse(reMappedArray);
            return csv;
        }
        return "";
    }

    getViewData(cancelToken: CancelTokenSource, viewName: string, page, size, filters: MetadataViewFilter[] = []): Promise<MetadataViewData> {
        const viewRequest: MetadataViewDataRequest = {
            view: viewName,
            filters,
            page: page + 1, // API endpoint expects 1-base page number
            size,
            includeJoinedViews: true
        };
        const requestOptions = cancelToken ? {...defaultRequestOptions, cancelToken: cancelToken.token} : defaultRequestOptions;

        return axios.post(metadataViewUrl, viewRequest, requestOptions)
            .then(extractJsonData)
            .catch(handleHttpError("Error while fetching view data."));
    }

    getCount(cancelToken: CancelTokenSource, viewName: string, filters: MetadataViewFilter[] = []): Promise<MetadataViewDataCount> {
        const viewRequest: MetadataViewCountRequest = {
            view: viewName,
            filters
        };
        const requestOptions = cancelToken ? {...defaultRequestOptions, cancelToken: cancelToken.token} : defaultRequestOptions;

        return axios.post(`${metadataViewUrl}count`, viewRequest, requestOptions)
            .then(extractJsonData)
            .catch(handleHttpError("Error while fetching view count."));
    }
}

export default new MetadataViewAPI();
