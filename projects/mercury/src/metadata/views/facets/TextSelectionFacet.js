/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect, useState} from 'react';
import {
    Checkbox,
    FormControl,
    FormControlLabel,
    FormGroup
} from "@material-ui/core";
import {Clear, Search} from "@material-ui/icons";
import CheckBoxOutlineBlankIcon from '@material-ui/icons/CheckBoxOutlineBlank';
import CheckBoxIcon from '@material-ui/icons/CheckBox';
import InputAdornment from "@material-ui/core/InputAdornment";
import TextField from "@material-ui/core/TextField";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import Tooltip from "@material-ui/core/Tooltip";
import Switch from "@material-ui/core/Switch";
import Grid from "@material-ui/core/Grid";
import type {MetadataViewFacetProperties, Option} from "../MetadataViewFacetFactory";
import Iri from "../../../common/components/Iri";
import useStateWithSessionStorage from "../../../common/hooks/UseSessionStorage";
import {SHOW_READABLE_COLLECTION_FACET_FILTER} from "../../../common/constants";
import {collectionAccessIcon} from '../../../collections/collectionUtils';


type SelectProperties = {
    options: Option[];
    onChange: (string[]) => void;
    textFilterValue: string;
    activeFilterValues: any[];
    showAccessFilter: boolean;
}

const SelectMultiple = (props: SelectProperties) => {
    const {options, onChange, textFilterValue, activeFilterValues, accessFilterValue, showAccessFilter, classes} = props;
    const defaultOptions = Object.fromEntries(options.map(option => [option.value, activeFilterValues.includes(option.value)]));
    const [state, setState] = useState(defaultOptions);

    const textFilter = (val) => (textFilterValue.trim() === "" || val.label.toLowerCase().includes(textFilterValue.toLowerCase()));

    const readAccessFilter = (val) => (!accessFilterValue || val.access !== 'List');

    const filterOptions = () => (options.filter(readAccessFilter).filter(textFilter));

    useEffect(() => {
        setState(defaultOptions);
    }, [activeFilterValues]);

    useEffect(() => {
        if (accessFilterValue) {
            const selectedReadableOnly = Object.entries(state)
                .filter(([option, checked]) => (options.filter(readAccessFilter).map(o => o.value).includes(option) && checked))
                .map(([option, checked]) => option);
            onChange(selectedReadableOnly);
        }
    }, [accessFilterValue]);

    const handleChange = (event) => {
        const newState = {...state, [event.target.name]: event.target.checked};
        const selected = Object.entries(newState)
            .filter(([option, checked]) => checked)
            .map(([option, checked]) => option);
        onChange(selected);
    };

    const renderCheckboxListElement = (option) => (
        <FormControlLabel
            key={option.value}
            control={(
                <Checkbox
                    checked={state[option.value]}
                    onChange={handleChange}
                    name={option.value}
                    icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                    checkedIcon={<CheckBoxIcon fontSize="small" />}
                    className={classes.checkbox}
                />
            )}
            label={(
                <Tooltip title={<Iri iri={option.value} />}>
                    <Typography variant="body2">
                        {option.label}
                    </Typography>
                </Tooltip>
            )}
        />
    );

    const renderCheckboxList = () => {
        if (showAccessFilter) {
            return filterOptions().map(option => (
                <Grid container direction="row" key={option.value}>
                    <Grid item xs={10}>
                        {renderCheckboxListElement(option)}
                    </Grid>
                    <Grid item xs={2} style={{textAlign: "right"}}>
                        {collectionAccessIcon(option.access, 'small')}
                    </Grid>
                </Grid>
            ));
        }
        return filterOptions().map(option => renderCheckboxListElement(option));
    };

    return (
        <FormGroup className={classes.multiselectList}>
            {renderCheckboxList()}
        </FormGroup>
    );
};

const TextSelectionFacet = (props: MetadataViewFacetProperties) => {
    const {options = [], onChange = () => {}, activeFilterValues, classes} = props;
    const [textFilterValue, setTextFilterValue] = useState("");
    const [showReadableFilterSelected, setShowReadableFilterSelected] = useStateWithSessionStorage(
        SHOW_READABLE_COLLECTION_FACET_FILTER, false
    );

    const showAccessFilter = options.some(o => o.access);

    if (!options || options.length === 0) {
        return (
            <Typography variant="body2">
                No filter available.
            </Typography>
        );
    }

    const selectAll = () => {
        onChange(options.map(option => option.value));
    };

    const deselectAll = () => {
        onChange([]);
    };

    const handleChangeSelectAll = (event) => {
        if (event.target.checked) {
            selectAll();
        } else {
            deselectAll();
        }
    };

    const renderSelectAllCheckbox = () => (
        <Checkbox
            checked={activeFilterValues.length === options.length}
            onChange={handleChangeSelectAll}
            icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
            checkedIcon={<CheckBoxIcon fontSize="small" />}
            className={classes.checkbox}
            title={activeFilterValues.length === options.length ? "Deselect all" : "Select all"}
        />
    );

    const renderAccessFilter = () => (
        <FormGroup className={classes.accessFilter}>
            <FormControlLabel
                control={(
                    <Switch
                        size="small"
                        color="primary"
                        checked={showReadableFilterSelected}
                        onChange={() => setShowReadableFilterSelected(!showReadableFilterSelected)}
                    />
                )}
                label="Show only readable"
            />
        </FormGroup>
    );

    const renderTextFilter = () => (
        <TextField
            value={textFilterValue}
            onChange={e => setTextFilterValue(e.target.value)}
            style={{marginBottom: 8}}
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <Search fontSize="small" />
                    </InputAdornment>
                ),
                endAdornment: (
                    <InputAdornment position="end">
                        {textFilterValue && (
                            <IconButton
                                onClick={() => setTextFilterValue("")}
                                disabled={!textFilterValue}
                                style={{order: 1}}
                            >
                                <Clear color="disabled" fontSize="small" />
                            </IconButton>
                        )}
                    </InputAdornment>
                ),
            }}
        />
    );

    const renderOptionsHeader = () => (
        <div>
            <Grid container direction="row" key="text-selection-facet-header">
                <Grid item xs={2}>
                    {renderSelectAllCheckbox()}
                </Grid>
                <Grid item xs={10}>
                    {renderTextFilter()}
                </Grid>
            </Grid>
            {showAccessFilter && renderAccessFilter()}
        </div>
    );

    return (
        <>
            {renderOptionsHeader()}
            <div className={classes.textContent}>
                <FormControl component="fieldset" style={{width: "100%"}}>
                    <SelectMultiple
                        options={options}
                        onChange={onChange}
                        classes={classes}
                        textFilterValue={textFilterValue}
                        activeFilterValues={activeFilterValues}
                        accessFilterValue={showReadableFilterSelected}
                        showAccessFilter={showAccessFilter}
                    />
                </FormControl>
            </div>
        </>
    );
};

export default TextSelectionFacet;
