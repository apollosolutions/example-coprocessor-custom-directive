/*
 * This logic and code was implemented from the following resources:
 *   - https://github.com/apollosolutions/simple-auth-directive
 */

import { getDirective, MapperKind, mapSchema } from "@graphql-tools/utils";
import { defaultFieldResolver } from "graphql";

// The header we parse to get the current role
export const USER_HEADER = "x-user-role";
export const AUTH_N_DIRECTIVE_NAME = "authenticated";
export const AUTH_Z_DIRECTIVE_NAME = "hasRole";

// The order of roles is important here as higher roles have bigger indexes
// and determine the order of hierarchy.
const ROLES = ['UNKNOWN', 'USER', 'PARTNER', 'ADMIN'];

/**
 * Transform the schema resolvers for every field or object that has the auth directives.
 * If the directive is present, run the requried checks, otherwise run the resolvers as normal.
 */
const getSchemaTransformer = (isAuthenticatedFn, getUserPermissionsFn) => {
    const typeDirectiveArgumentMaps = {};
    return {
        authDirectiveTransformer: (schema) =>
            mapSchema(schema, {
                [MapperKind.TYPE]: type => {
                    // Save the authn info to the type fields
                    const authnDirective = getDirective(schema, type, AUTH_N_DIRECTIVE_NAME)?.[0];
                    if (authnDirective) {
                        typeDirectiveArgumentMaps[type.name] = authnDirective;
                    }

                    // Save the authz info to the type fields
                    const authzDirective = getDirective(schema, type, AUTH_Z_DIRECTIVE_NAME)?.[0];
                    if (authzDirective) {
                        typeDirectiveArgumentMaps[type.name] = authzDirective;
                    }

                    return undefined;
                },
                [MapperKind.OBJECT_FIELD]: (fieldConfig, _fieldName, typeName) => {
                    const authNDirective =
                        getDirective(schema, fieldConfig, AUTH_N_DIRECTIVE_NAME)?.[0] ?? typeDirectiveArgumentMaps[typeName];
                    const authZDirective =
                        getDirective(schema, fieldConfig, AUTH_Z_DIRECTIVE_NAME)?.[0] ?? typeDirectiveArgumentMaps[typeName];

                    const { resolve = defaultFieldResolver } = fieldConfig;
                    fieldConfig.resolve = function (source, args, context, info) {
                        // The Router passes an array even if there is only 1 value
                        const contextValue = context.headers?.[USER_HEADER]?.[0];

                        // Check if the field requires authentication
                        if (authNDirective && !isAuthenticatedFn(contextValue)) {
                            throw new Error(`Not authenticated. The GraphQL context did not contain the ${USER_HEADER} value`);
                        }

                        // Get the required authorization role for the requested field
                        const requiredAuthZ = authZDirective?.requires;
                        if (requiredAuthZ) {
                            if (!contextValue) {
                                throw new Error(`Invalid role for authorization. The GraphQL context did not contain the ${USER_HEADER} value`);
                            }
                            const user = getUserPermissionsFn(contextValue);
                            if (!user.hasRole(requiredAuthZ)) {
                                throw new Error(`Not authorized. The provided role '${contextValue}' does not meet schema requirements`);
                            }
                        }

                        // Else, run the resolvers as normal
                        return resolve(source, args, context, info);
                    }
                    return fieldConfig;
                }
            })
    }
};

/**
 * This function is where you could do more advanced logic to parse a token, validate it,
 * and check the user's permissions against the schema roles. For simplicity in the demo,
 * we just accept the raw value from the header as the role.
 */
const getUserPermissions = roleDefinedInHeader => ({
    hasRole: (roleRequiredInSchema) => {
        const headerIndex = ROLES.indexOf(roleDefinedInHeader);
        const schemaIndex = ROLES.indexOf(roleRequiredInSchema);
        return schemaIndex >= 0 && headerIndex >= schemaIndex;
    }
});

/**
 * This function is called to validate the header value. In a real app this would parse some token
 * and probably call and external service. For our simple demo we will just check the existence of the header.
 */
const isAuthenticated = (headerValue) => {
    return !!headerValue
};

export const { authDirectiveTransformer } = getSchemaTransformer(isAuthenticated, getUserPermissions);
