/**
 * Copyright (c) 2023, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Grid } from "@oxygen-ui/react";
import { VerticalStepper, VerticalStepperStepInterface } from "@wso2is/common";
import { AlertLevels, IdentifiableComponentInterface } from "@wso2is/core/models";
import { addAlert } from "@wso2is/core/store";
import { EmphasizedSegment, PageLayout } from "@wso2is/react-components";
import { AxiosError, AxiosResponse } from "axios";
import React, { FunctionComponent, ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { Dispatch } from "redux";
import { RoleBasics } from "./role-basics";
import { RolePermissionsList } from "./role-permissions/role-permissions";
import { AppConstants } from "../../../core/constants";
import { history } from "../../../core/helpers";
import { store } from "../../../core/store";
import { createRole } from "../../api/roles";
import { RoleAudienceTypes } from "../../constants";
import {
    CreateRoleFormData,
    CreateRoleInterface,
    CreateRoleStateInterface,
    CreateRoleStepsFormTypes,
    SelectedPermissionsInterface
} from "../../models";

/**
 * Interface which captures create role props.
 */
type CreateRoleProps = IdentifiableComponentInterface;

/**
 * Component to handle addition of a new role to the system.
 *
 * @param props - props related to the create role stepper
 */
export const CreateRoleWizard: FunctionComponent<CreateRoleProps> = (props: CreateRoleProps): ReactElement => {

    const { [ "data-componentid" ]: componentId } = props;

    const { t } = useTranslation();
    const dispatch: Dispatch = useDispatch();

    const [ stepperState, setStepperState ] = useState<CreateRoleStateInterface>(undefined);
    const [ isBasicDetailsNextButtonDisabled, setIsBasicDetailsNextButtonDisabled ] = useState<boolean>(true);
    const [ isPermissionStepNextButtonDisabled, setIsPermissionStepNextButtonDisabled ] = useState<boolean>(true);
    const [ selectedPermissions, setSelectedPermissions ] = useState<SelectedPermissionsInterface[]>([]);
    const [ isSubmitting, setIsSubmitting ] = useState<boolean>(false);

    // External trigger to submit the authorization step. 
    let submitRoleBasic: () => void;

    /**
     * Handles wizard step submit.
     *
     * @param values - Forms values to be stored in state.
     * @param formType - Type of the form.
     */
    const handleWizardSubmit = (values: CreateRoleFormData, formType: CreateRoleStepsFormTypes) => {
        setStepperState({ ...stepperState, [ formType ]: values });
    };

    /**
     * Handle create role action when create role wizard finish action is triggered.
     *
     * @param basicData - basic data required to create role.
     */
    const addRole = (): void => {
        if (!isPermissionStepNextButtonDisabled) {
            setIsSubmitting(true);

            const roleAudience: string = stepperState[ CreateRoleStepsFormTypes.BASIC_DETAILS ].roleAudience;
            const organizationId: string = store.getState().organization.organization.id;
    
            const roleData: CreateRoleInterface = {
                audience: roleAudience === RoleAudienceTypes.ORGANIZATION
                    ? {
                        type: roleAudience,
                        value: organizationId
                    }    
                    : {
                        type: roleAudience,
                        value: stepperState[ CreateRoleStepsFormTypes.BASIC_DETAILS ].assignedApplicationId
                    },
                displayName: stepperState[ CreateRoleStepsFormTypes.BASIC_DETAILS ].roleName,
                permissions: [],
                schemas: []
            };
    
            // Create Role API Call.
            createRole(roleData)
                .then((response: AxiosResponse) => {
                    if (response.status === 201) {
                        dispatch(addAlert({
                            description: t("console:manage.features.roles.notifications.createRole.success" +
                                ".description"),
                            level: AlertLevels.SUCCESS,
                            message: t("console:manage.features.roles.notifications.createRole.success.message")
                        }));
    
                        history.push(AppConstants.getPaths().get("ROLE_EDIT").replace(":id", response.data.id));
                    }
                })
                .catch((error: AxiosError) => {
                    if (!error.response || error.response.status === 401) {
                        dispatch(addAlert({
                            description: t("console:manage.features.roles.notifications.createRole.error" +
                                    ".description"),
                            level: AlertLevels.ERROR,
                            message: t("console:manage.features.roles.notifications.createRole.error.message")
                        }));
                    } else if (error.response && error.response.data.detail) {
                        dispatch(addAlert({
                            description: t("console:manage.features.roles.notifications.createRole.error" +
                                ".description",
                            { description: error.response.data.detail }),
                            level: AlertLevels.ERROR,
                            message: t("console:manage.features.roles.notifications.createRole.error.message")
                        }));
                    } else {
                        dispatch(addAlert({
                            description: t("console:manage.features.roles.notifications.createRole.genericError" +
                                ".description"),
                            level: AlertLevels.ERROR,
                            message: t("console:manage.features.roles.notifications.createRole.genericError.message")
                        }));
                    }
                })
                .finally(() => {
                    setIsSubmitting(false);
                });
        }
    };

    const creationFlowSteps: VerticalStepperStepInterface[] = [
        {
            preventGoToNextStep: isBasicDetailsNextButtonDisabled,
            stepAction: () => submitRoleBasic(),
            stepContent: (
                <RoleBasics
                    triggerSubmission={ (submitFunctionCb: () => void) => {
                        submitRoleBasic = submitFunctionCb;
                    } }
                    setIsNextDisabled={ setIsBasicDetailsNextButtonDisabled }
                    initialValues={ stepperState && stepperState[ CreateRoleStepsFormTypes.BASIC_DETAILS ] }
                    onSubmit={ (values: CreateRoleFormData) => {
                        handleWizardSubmit(values, CreateRoleStepsFormTypes.BASIC_DETAILS);
                    } }
                />
            ),
            stepTitle: t("console:manage.features.roles.addRoleWizard.wizardSteps.0")
        },
        {
            preventGoToNextStep: isPermissionStepNextButtonDisabled,
            stepContent: (
                <RolePermissionsList
                    selectedPermissions={ selectedPermissions }
                    setSelectedPermissions={ setSelectedPermissions }
                    setIsPermissionStepNextButtonDisabled={ setIsPermissionStepNextButtonDisabled }
                    roleAudience={ 
                        stepperState && 
                        stepperState[ CreateRoleStepsFormTypes.BASIC_DETAILS ]?.roleAudience as RoleAudienceTypes 
                    }
                    assignedApplicationId={
                        stepperState &&
                        stepperState[ CreateRoleStepsFormTypes.BASIC_DETAILS ]?.assignedApplicationId
                    }
                    assignedApplicationName={
                        stepperState &&
                        stepperState[ CreateRoleStepsFormTypes.BASIC_DETAILS ]?.assignedApplicationName
                    }
                />
            ),
            stepTitle: t("console:manage.features.roles.addRoleWizard.wizardSteps.1")
        }
    ];

    return (
        <PageLayout
            title={ t("console:manage.features.roles.addRoleWizard.heading", { type: "Role" }) }
            contentTopMargin={ true }
            description={ t("console:manage.features.roles.addRoleWizard.subHeading", { type: "role" }) }
            backButton={ {
                "data-componentid": `${componentId}-page-back-button`,
                onClick: () => history.push(AppConstants.getPaths().get("ROLES")),
                text: t("console:manage.features.roles.addRoleWizard.back") 
            } }
            titleTextAlign="left"
            bottomMargin={ false }
            showBottomDivider
            data-componentid={ `${componentId}-page-layout` }
        >
            <div className="remote-user-store-create-section">
                <EmphasizedSegment padded="very" loading={ isSubmitting }>
                    <Grid container>
                        <Grid>
                            <VerticalStepper
                                alwaysOpen={ false }
                                isSidePanelOpen={ false }
                                stepContent={ creationFlowSteps }
                                isNextEnabled={ true }
                                data-componentid={ `${componentId}-vertical-stepper` }
                                handleFinishAction={ () => addRole() }
                            />
                        </Grid>
                    </Grid>
                </EmphasizedSegment>
            </div>
        </PageLayout>
    );
};

/**
 * Default props for Create role wizard component.
 */
CreateRoleWizard.defaultProps = {
    "data-componentid": "create-role-wizard"
};