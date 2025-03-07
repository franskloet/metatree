import React, {useContext, useEffect, useState} from 'react';
import _ from 'lodash';
import {useHistory} from "react-router-dom";
import {Button, Grid, Typography, withStyles} from '@material-ui/core';
import Tabs from "@material-ui/core/Tabs";
// import axios from "axios";
import Tab from "@material-ui/core/Tab";
import {Assignment, Close} from "@material-ui/icons";
import styles from "./MetadataView.styles";
import Facet from './MetadataViewFacetFactory';
import MetadataViewAPI from "./MetadataViewAPI";
import type {MetadataViewFacet, MetadataViewFilter, MetadataViewOptions, ValueType} from "./MetadataViewAPI";
import BreadCrumbs from '../../common/components/BreadCrumbs';
import MetadataViewContext from "./MetadataViewContext";
import BreadcrumbsContext from "../../common/contexts/BreadcrumbsContext";
import {getLocationContextFromString, getMetadataViewNameFromString} from "../../search/searchUtils";
import type {MetadataViewEntity} from "./metadataViewUtils";
import {getMetadataViewsPath, getMetadataViewsPathContext, ofBooleanValueType, ofRangeValueType, RESOURCES_VIEW} from "./metadataViewUtils";
import MetadataViewActiveFacetFilters from "./MetadataViewActiveFacetFilters";
import MetadataViewInformationDrawer from "./MetadataViewInformationDrawer";
import {useSingleSelection} from "../../file/UseSelection";
import LoadingInlay from "../../common/components/LoadingInlay";
import MessageDisplay from "../../common/components/MessageDisplay";
import MetadataViewTableContainer from "./MetadataViewTableContainer";
import {getParentPath, getPathFromIri} from "../../file/fileUtils";
import usePageTitleUpdater from "../../common/hooks/UsePageTitleUpdater";
import MetadataViewFacetsContext from "./MetadataViewFacetsContext";
import {TabPanel} from "../../layout/TabPanel";

type MetadataViewProperties = {
    classes: any;
    facets: MetadataViewFacet[];
    views: MetadataViewOptions[];
    filters: MetadataViewFilter[];
    locationContext: string;
    currentViewName: string;
    handleViewChangeRedirect: () => {};
}

type ContextualMetadataViewProperties = {
    classes: any;
}

export const MetadataView = (props: MetadataViewProperties) => {
    const {views, facets, currentViewName, locationContext, classes, handleViewChangeRedirect, filters} = props;

    usePageTitleUpdater("Metadata");

    const {toggle, selected} = useSingleSelection();

    const {updateFilters, clearFilter, clearAllFilters} = useContext(MetadataViewContext);
    const [filterCandidates, setFilterCandidates] = useState([]);
    const [textFiltersObject, setTextFiltersObject] = useState({});

    const toggleRow = (entity: MetadataViewEntity) => (toggle(entity));

    const currentViewIndex = Math.max(0, views.map(v => v.name).indexOf(currentViewName));
    const currentView = views[currentViewIndex];

    const a11yProps = (index) => ({
        'key': `metadata-view-tab-${index}`,
        'aria-controls': `metadata-view-tab-${index}`,
    });

    const changeTab = (event, tabIndex) => {
        toggle();
        setTextFiltersObject({});
        handleViewChangeRedirect(views[tabIndex].name);
    };

    const clearFilterCandidates = () => {
        setFilterCandidates([]);
    };

    const applyFilters = () => {
        updateFilters(filterCandidates);
        clearFilterCandidates();
    };

    const exportWithChrome = async (aData, aFileName) => {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: aFileName,
            types: [{
                description: 'csv files',
                accept: {
                    'text/csv': ['.csv'],
                },
            }],
        });
        const fileStream = await fileHandle.createWritable();
        await fileStream.write(aData);
        await fileStream.close();
    };

    const exportWithFirefox = async (aData, aFileName) => {
        const alnk = document.createElement("a");
        alnk.download = aFileName;
        const blob = new Blob([aData], {type: "text/csv"});
        alnk.href = window.URL.createObjectURL(blob);
        alnk.dataset.downloadUrl = ['text/csv', alnk.download, alnk.href].join(":");
        const evt = new MouseEvent('click', {
            view: window,
        });
        alnk.dispatchEvent(evt);
    };

    const exportData = async () => {
        if (currentView) {
            MetadataViewAPI.getExportData(currentView.name, filters, locationContext)
                .then(async (theData) => {
                    const suggestedName = "metatree_" + currentView.name + "_ouput.csv";
                    if (typeof window.showSaveFilePicker === "function") {
                        exportWithChrome(theData, suggestedName);
                    } else {
                        exportWithFirefox(theData, suggestedName);
                    }
                });
        }
    };

    const getFilterValues = (type: ValueType, filter: MetadataViewFilter): any[] => {
        if (ofRangeValueType(type)) {
            return [filter.min, filter.max];
        }
        if (ofBooleanValueType(type)) {
            return filter.booleanValue === null ? [] : [filter.booleanValue];
        }
        return filter.values;
    };

    const setFilterValues = (type: ValueType, filter: MetadataViewFilter, values: any[]) => {
        if (ofRangeValueType(type)) {
            [filter.min, filter.max] = values;
        } else if (ofBooleanValueType(type)) {
            filter.booleanValue = values.length > 0 ? values[0] : null;
        } else {
            filter.values = values;
        }
    };

    const updateFilterCandidates = (facet: MetadataViewFacet, newValues: any[]) => {
        if (filterCandidates.find(f => f.field === facet.name)) {
            let updatedFilters;
            const existingFilter = filters.find(f => f.field === facet.name);
            if (!newValues || (existingFilter && existingFilter.values && _.isEqual(existingFilter.values.sort(), newValues.sort()) && (
                (newValues.filter(v => v !== null).length === 0) || existingFilter.value))) {
                updatedFilters = [...filterCandidates.filter(f => f.field !== facet.name)];
            } else {
                updatedFilters = [...filterCandidates];
                const filter = updatedFilters.find(f => (f.field === facet.name));
                setFilterValues(facet.type, filter, newValues);
            }
            setFilterCandidates(updatedFilters);
        } else if (newValues) {
            const newFilter: MetadataViewFilter = {
                field: facet.name
            };
            setFilterValues(facet.type, newFilter, newValues);
            setFilterCandidates([...filterCandidates, newFilter]);
        }
    };

    const handleClearAllFilters = () => {
        setFilterCandidates([]);
        setTextFiltersObject({});
        clearAllFilters();
    };

    const handleClearFilter = (facetName: string) => {
        setFilterCandidates([...filterCandidates.filter(f => f.field !== facetName)]);
        clearFilter(facetName);
    };

    // const appendCustomColumns = (view: MetadataViewOptions) => {
    //     if (view.name === RESOURCES_VIEW) {
    //         return [
    //             view.columns.find(c => c.name === RESOURCES_VIEW),
    //             // any custom column here
    //             ...view.columns.filter(c => c.name !== RESOURCES_VIEW),
    //         ];
    //     }
    //     return view.columns;
    // };

    const appendCustomColumns = (view: MetadataViewOptions) => {
        if (RESOURCES_VIEW.includes(view.name)) {
            return [
                view.columns.find(c => RESOURCES_VIEW.includes(c.name)),
                // any custom column here
                ...view.columns.filter(c => !(RESOURCES_VIEW.includes(c.name))),
            ];
        }
        return view.columns;
    };

    const renderSingleFacet = (facet: MetadataViewFacet) => {
        const facetOptions = getFilterValues(facet.type, facet);
        const activeFilter = [...filterCandidates, ...filters].find(filter => filter.field === facet.name);
        let activeFilterValues = [];
        if (activeFilter) {
            activeFilterValues = getFilterValues(facet.type, activeFilter);
        }
        return facetOptions && facetOptions.length > 0 && (
            <Grid key={facet.name} item>
                <Facet
                    type={facet.type}
                    title={facet.title}
                    options={facetOptions}
                    onChange={(values) => updateFilterCandidates(facet, values)}
                    extraClasses={classes.facet}
                    activeFilterValues={activeFilterValues}
                    clearFilter={() => handleClearFilter(facet.name)}
                />
            </Grid>
        );
    };

    const renderFacetConfirmButtons = (
        <Grid
            container
            spacing={2}
            className={`${classes.confirmFiltersButtonBlock} ${filterCandidates.length > 0 && classes.confirmFiltersButtonBlockActive}`}
        >
            <Grid item xs={4}>
                <Button
                    onClick={clearFilterCandidates}
                    variant="contained"
                    color="default"
                    className={classes.confirmFiltersButton}
                    disabled={filterCandidates.length === 0}
                >
                    Cancel
                </Button>
            </Grid>
            <Grid item xs={8}>
                <Button
                    onClick={applyFilters}
                    variant="contained"
                    color="secondary"
                    className={classes.confirmFiltersButton}
                    disabled={filterCandidates.length === 0}
                >
                    Apply filters
                </Button>
            </Grid>
            <Grid item xs={12}>
                <Button
                    onClick={exportData}
                    variant="contained"
                    color="secondary"
                    className={classes.confirmFiltersButton}
                >
                    Export Data
                </Button>
            </Grid>
        </Grid>
    );

    const renderFacets = (view: MetadataViewOptions) => (
        facets.length > 0 && (
            <Grid key={view.name} container item direction="column" justifyContent="flex-start" spacing={1}>
                <div className={classes.facetHeaders} style={{textTransform: 'uppercase'}}>{view.title}</div>
                {
                    // FK, only render unique (by name) facets
                    [...new Map(facets.map(item => [item.name, item])).values()].map(facet => renderSingleFacet(facet))
                    // facets.map(facet => renderSingleFacet(facet))
                }
                {
                    // location is the collection location, which we will group under resources
                    (view.name.toLowerCase() === 'resource') ? (
                        facets
                            .filter(facet => facet.name.toLowerCase().startsWith('location'))
                            .map(facet => (renderSingleFacet(facet)))
                    ) : ""
                }
            </Grid>
        ));

    const renderViewTabs = () => (
        <div>
            <Tabs
                value={currentViewIndex}
                onChange={changeTab}
                indicatorColor="primary"
                textColor="primary"
                variant="scrollable"
                scrollButtons="auto"
                aria-label="metadata view tabs"
                className={classes.tabsPanel}
            >
                {views.map((view, index) => (
                    <Tab label={view.title} {...a11yProps(index)} />
                ))}
            </Tabs>
            {views.map((view, index) => (
                <TabPanel value={currentViewIndex} index={index} {...a11yProps(index)} className={classes.tab}>
                    <MetadataViewTableContainer
                        columns={appendCustomColumns(view)}
                        view={view.name}
                        filters={filters}
                        locationContext={locationContext}
                        selected={selected}
                        toggleRow={toggleRow}
                        hasInactiveFilters={filterCandidates.length > 0}
                        textFiltersObject={textFiltersObject}
                        setTextFiltersObject={setTextFiltersObject}
                    />
                </TabPanel>
            ))}
        </div>
    );

    const getPathSegments = () => {
        const segments = ((locationContext && getPathFromIri(locationContext)) || '').split('/');
        const result = [];
        if (segments[0] === '') {
            return result;
        }
        // point to the first (the main) view. Multiple Tabs Here ?
        const pathPrefix = getMetadataViewsPath(RESOURCES_VIEW[0]) + '&context=';
        let path = locationContext;
        segments.reverse().forEach(segment => {
            result.push({label: segment, href: (pathPrefix + encodeURIComponent(path))});
            path = getParentPath(path);
        });
        return result.reverse();
    };

    const areFacetFiltersNonEmpty = () => filters && filters.some(filter => facets.some(facet => facet.name === filter.field));
    const areTextFiltersNonEmpty = () => textFiltersObject && Object.keys(textFiltersObject).length > 0;

    return (
        <BreadcrumbsContext.Provider value={{
            segments: [{label: "Metadata", href: getMetadataViewsPath(currentView.name), icon: <Assignment />}]
        }}
        >
            <BreadCrumbs additionalSegments={getPathSegments()} />
            {(areFacetFiltersNonEmpty() || areTextFiltersNonEmpty()) && (
                <Grid container justifyContent="space-between" direction="row-reverse">
                    <Grid item xs={2} className={classes.clearAllButtonContainer}>
                        <Button className={classes.clearAllButton} startIcon={<Close />} onClick={handleClearAllFilters}>
                            Clear all filters
                        </Button>
                    </Grid>
                    {areFacetFiltersNonEmpty() && (
                        <Grid item container xs alignItems="center" spacing={1}>
                            <Grid item>
                                <Typography variant="overline" component="span" color="textSecondary">Active filters:</Typography>
                            </Grid>
                            <Grid item>
                                <MetadataViewActiveFacetFilters facets={facets} filters={filters} setFilters={updateFilters} />
                            </Grid>
                        </Grid>
                    )}
                </Grid>
            )}
            <Grid container direction="row" spacing={1} wrap="nowrap">
                <Grid item className={`${classes.centralPanel} ${!selected && classes.centralPanelFullWidth}`}>
                    <Grid container direction="row" spacing={1} wrap="nowrap">
                        <Grid item className={classes.facets}>
                            <Grid container item direction="column" justifyContent="flex-start" spacing={1}>
                                { /** views.map(view => renderFacets(view))
                                  only render facets of first view */
                                    renderFacets(views[0])
                                }
                                {renderFacetConfirmButtons}
                            </Grid>
                        </Grid>
                        <Grid item className={classes.metadataViewTabs}>
                            {renderViewTabs()}
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item className={classes.sidePanel} hidden={!selected}>
                    <MetadataViewInformationDrawer
                        forceExpand
                        entity={selected}
                        viewIcon=<Assignment />
                    />
                </Grid>
            </Grid>
        </BreadcrumbsContext.Provider>
    );
};

export const ContextualMetadataView = (props: ContextualMetadataViewProperties) => {
    const {views = [], loading, error, filters} = useContext(MetadataViewContext);
    const {facets = [], facetsLoading, facetsError, initialLoad} = useContext(MetadataViewFacetsContext);
    const currentViewName = getMetadataViewNameFromString(window.location.search);
    const locationContext = getLocationContextFromString(window.location.search);
    const history = useHistory();

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {initialLoad();}, []);

    if ((error && error.message)) {
        return <MessageDisplay message={error.message} />;
    }
    if (facetsError && facetsError.message) {
        return <MessageDisplay message={facetsError.message} />;
    }
    if (loading || facetsLoading) {
        return <LoadingInlay />;
    }

    if (views.length < 1) {
        return <MessageDisplay message="No metadata view found." />;
    }

    const handleViewChangeRedirect = (viewName) => {
        if (viewName) {
            if (locationContext) {
                history.push(getMetadataViewsPathContext(viewName, locationContext));
            } else {
                history.push(getMetadataViewsPath(viewName));
            }
        }
    };

    // return (
    //     <MetadataView
    //         {...props}
    //         facets={facets}
    //         views={views}
    //         locationContext={currentViewName === RESOURCES_VIEW && locationContext}
    //         currentViewName={currentViewName}
    //         filters={filters}
    //         handleViewChangeRedirect={handleViewChangeRedirect}
    //     />
    // );

    return (
        <MetadataView
            {...props}
            facets={facets}
            views={views}
            locationContext={RESOURCES_VIEW.includes(currentViewName) && locationContext}
            currentViewName={currentViewName}
            filters={filters}
            handleViewChangeRedirect={handleViewChangeRedirect}
        />
    );
};

export default withStyles(styles)(ContextualMetadataView);
