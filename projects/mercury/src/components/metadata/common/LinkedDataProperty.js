import React from 'react';
import PropTypes from "prop-types";

import {IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, Typography} from '@material-ui/core';

import ClearIcon from '@material-ui/icons/Clear';

class LinkedDataProperty extends React.Component {
    state = {
        hoveredIndex: null
    };

    setHoveredIndex = (hoveredIndex) => {
        this.setState({hoveredIndex});
    };

    renderEntry = (entry, idx, PropertyValueComponent, labelledBy) => {
        const {editable, property, onChange, onDelete} = this.props;
        const visibility = this.state.hoveredIndex === idx ? 'visible' : 'hidden';

        return (
            <div
                key={property.key + entry.id || entry.value}
                onMouseEnter={() => this.setHoveredIndex(idx)}
                onMouseLeave={() => this.setHoveredIndex(null)}
            >
                <ListItem>
                    <ListItemText>
                        <PropertyValueComponent
                            property={property}
                            entry={entry}
                            onChange={(value) => onChange(value, idx)}
                            aria-labelledby={labelledBy}
                        />
                    </ListItemText>
                    {
                        editable
                            ? (
                                <ListItemSecondaryAction>
                                    <IconButton
                                        size="small"
                                        aria-label="Delete"
                                        title="Delete"
                                        onClick={() => onDelete(idx)}
                                        style={{visibility}}
                                    >
                                        <ClearIcon />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            ) : null
                    }
                </ListItem>
            </div>
        );
    };

    renderAddComponent = (labelledBy) => {
        const {property, onAdd} = this.props;
        const ValueAddComponent = this.props.valueComponentFactory.addComponent(property);

        return (
            <ListItem key="add-component-key">
                <ListItemText>
                    <ValueAddComponent
                        property={property}
                        placeholder="Add new"
                        onChange={onAdd}
                        aria-labelledby={labelledBy}
                    />
                </ListItemText>
            </ListItem>
        );
    };

    render() {
        const {editable, property} = this.props;

        // Do not show an add component if no multiples are allowed
        // and there is already a value
        const editableAndNotMachineOnly = editable && !property.machineOnly;
        const canAdd = editableAndNotMachineOnly && (property.allowMultiple || !property.values || property.values.length === 0);
        const labelId = `label-${property.key}`;

        // The edit component should not actually allow editing the value if editable is set to false
        // or if the property contains settings that disallow editing existing values
        const disableEditing = !editable || LinkedDataProperty.disallowEditingOfExistingValues(property);
        const ValueComponent = disableEditing
            ? this.props.valueComponentFactory.readOnlyComponent()
            : this.props.valueComponentFactory.editComponent(property);

        return (
            <ListItem disableGutters style={{display: 'block'}}>
                <Typography variant="body1" component="label" id={labelId}>
                    {property.label}
                </Typography>
                <List dense>
                    {property.values.map((entry, idx) => this.renderEntry(entry, idx, ValueComponent, labelId))}
                    {canAdd ? this.renderAddComponent(labelId) : null}
                </List>
            </ListItem>
        );
    }

    /**
     * Checks whether the configuration of this property disallowed editing of existing values
     * This is the case if
     *   - the property is machineOnly
     *   - the field refers to a url (marked as RESOURCE_URI)
     *   - the value is taken from a set of allowed values
     * @param property
     * @returns {Boolean}
     */
    static disallowEditingOfExistingValues(property) {
        return property.machineOnly
            || property.isGenericIriResource
            || property.allowedValues;
    }
}

LinkedDataProperty.propTypes = {
    onChange: PropTypes.func,
    editable: PropTypes.bool,
    property: PropTypes.object,

    valueComponentFactory: PropTypes.shape({
        editComponent: PropTypes.func,
        addComponent: PropTypes.func,
        readOnlyComponent: PropTypes.func
    }).isRequired
}
LinkedDataProperty.defaultProps = {
    onChange: () => {},
    editable: true,
};

export default LinkedDataProperty;
