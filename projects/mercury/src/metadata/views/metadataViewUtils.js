import type {ValueType} from "./MetadataViewAPI";

export const RESOURCES_VIEW = ["Files", "Studies", "Projects", "PrincipalInvestigators", "Objects"];

export type MetadataViewEntity = {
    iri: string;
    label: string;
}

export type MetadataViewEntityWithLinkedFiles = MetadataViewEntity & {|
    linkedFiles: MetadataViewEntity[];
|}

export const getMetadataViewsPath = (viewName: string) => {
    let path = '/metadata-views';
    if (viewName) {
        path += `?view=${viewName}`;
    }
    return path;
};

export const getMetadataViewsPathContext = (viewName: string, conText: string) => {
    let path = '/metadata-views';
    if (viewName) {
        path += `?context=${encodeURIComponent(conText)}&view=${viewName}`;
    }
    return path;
};

export const ofRangeValueType: boolean = (type: ValueType) => type === 'Number' || type === 'Date';
export const ofBooleanValueType: boolean = (type: ValueType) => type === 'Boolean';
