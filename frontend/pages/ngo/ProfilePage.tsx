import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext.tsx';
import { ngoAPI } from '../../services/api.ts';
import Button from '../../components/Button.tsx';
import {
    FiSave,
    FiLoader,
    FiHeart,
    FiShield,
    FiUser,
    FiCreditCard
} from 'react-icons/fi';
import { useToast } from '../../context/ToastContext.tsx';

// Re-using admin components for consistency
const FormField = ({
    label,
    name,
    value,
    onChange,
    type = 'text',
    children
}: any) => (
    <div>
        <label
            htmlFor={name}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
            {label}
        </label>

        {children || (
            <input
                type={type}
                id={name}
                name={name}
                value={type === 'checkbox' ? undefined : value || ''}
                checked={type === 'checkbox' ? Boolean(value) : undefined}
                onChange={onChange}
                className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-gold"
            />
        )}
    </div>
);

const FormSection = ({
    title,
    icon,
    children
}: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}) => (
    <div className="bg-white dark:bg-brand-dark-200 p-6 rounded-lg shadow-md space-y-4">
        <h3 className="text-lg font-semibold mb-4 border-b dark:border-gray-700 pb-2 flex items-center gap-2">
            {icon} {title}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children}
        </div>
    </div>
);

const NgoProfilePage: React.FC = () => {
    const {
        user: currentUser,
        loading: authLoading
    } = useContext(AuthContext);

    const [profile, setProfile] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const { addToast } = useToast();

    // ============================================================
    // LOAD NGO PROFILE
    // ============================================================
    useEffect(() => {
    if (!authLoading && currentUser) {
        ngoAPI.getProfile()
            .then((response: any) => {
                console.log('NGO profile response:', response);

                const ngoProfile =
                    response?.ngo ||
                    response?.data?.ngo ||
                    response?.entity ||
                    response?.data ||
                    response;

                setProfile(ngoProfile);

                setFormData({
                    ...ngoProfile,
                    authorizedPerson:
                        ngoProfile?.authorizedPerson || {},
                    bankDetails:
                        ngoProfile?.bankDetails || {}
                });

                setLoading(false);
            })
            .catch((err: any) => {
                console.error(
                    'Failed to load NGO profile:',
                    err
                );

                addToast(
                    err?.message ||
                        'Failed to load NGO profile',
                    'error'
                );

                setLoading(false);
            });
    }
}, [currentUser, authLoading, addToast]);
    // ============================================================
    // HANDLE FORM CHANGES
    // ============================================================
    const handleInputChange = (
        e: React.ChangeEvent<
            HTMLInputElement |
            HTMLSelectElement |
            HTMLTextAreaElement
        >
    ) => {
        const {
            name,
            value,
            type
        } = e.target;

        const checked =
            (e.target as HTMLInputElement).checked;

        const keys = name.split('.');

        setFormData((previous: any) => {
            const newFormData =
                JSON.parse(
                    JSON.stringify(previous ?? {})
                );

            let current = newFormData;

            for (
                let i = 0;
                i < keys.length - 1;
                i++
            ) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {};
                }

                current = current[keys[i]];
            }

            const finalKey =
                keys[keys.length - 1];

            current[finalKey] =
                type === 'checkbox'
                    ? checked
                    : value;

            return newFormData;
        });
    };

    // ============================================================
    // SAVE NGO PROFILE
    // ============================================================
    const handleSave = async (
    e: React.FormEvent
) => {
    e.preventDefault();

    setIsSaving(true);

    try {
        const response: any =
            await ngoAPI.updateProfile(formData);

        console.log(
            'NGO profile update response:',
            response
        );

        const updatedProfile =
            response?.ngo ||
            response?.data?.ngo ||
            response?.entity ||
            response?.data ||
            response;

        setProfile(updatedProfile);

        setFormData({
            ...updatedProfile,
            authorizedPerson:
                updatedProfile?.authorizedPerson || {},
            bankDetails:
                updatedProfile?.bankDetails || {}
        });

        addToast(
            'Profile updated successfully!',
            'success'
        );

    } catch (err: any) {
        console.error(
            'Failed to update NGO profile:',
            err
        );

        addToast(
            `Failed to update profile: ${
                err?.message ||
                'Unknown error'
            }`,
            'error'
        );
    } finally {
        setIsSaving(false);
    }
};
    // ============================================================
    // LOADING
    // ============================================================
    if (loading || authLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <FiLoader className="animate-spin h-8 w-8 text-brand-gold" />
            </div>
        );
    }

    // ============================================================
    // PAGE
    // ============================================================
    return (
        <div className="space-y-6">

            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                Edit My Profile
            </h1>

            <form
                onSubmit={handleSave}
                className="space-y-6"
            >

                {/* ==================================================
                    NGO PROFILE
                ================================================== */}
                <FormSection
                    title="NGO Profile"
                    icon={<FiHeart />}
                >
                    <FormField
                        label="NGO Name"
                        name="ngoName"
                        value={formData.ngoName}
                        onChange={handleInputChange}
                    />

                    <FormField
                        label="Registration Number"
                        name="registrationNumber"
                        value={
                            formData.registrationNumber
                        }
                        onChange={handleInputChange}
                    />

                    <FormField
                        label="Address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                    />

                    <FormField
                        label="Website"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        type="url"
                    />
                </FormSection>

                {/* ==================================================
                    LEGAL INFORMATION
                ================================================== */}
                <FormSection
                    title="Legal Info"
                    icon={<FiShield />}
                >
                    <FormField
                        label="PAN"
                        name="panNumber"
                        value={formData.panNumber}
                        onChange={handleInputChange}
                    />

                    <FormField
                        label="TAN"
                        name="tanNumber"
                        value={formData.tanNumber}
                        onChange={handleInputChange}
                    />

                    <FormField
                        label="80G Certified"
                        name="is80GCertified"
                        value={
                            formData.is80GCertified
                        }
                        onChange={handleInputChange}
                        type="checkbox"
                    />

                    <FormField
                        label="12A Certified"
                        name="is12ACertified"
                        value={
                            formData.is12ACertified
                        }
                        onChange={handleInputChange}
                        type="checkbox"
                    />
                </FormSection>

                {/* ==================================================
                    AUTHORIZED PERSON
                ================================================== */}
                <FormSection
                    title="Authorized Person"
                    icon={<FiUser />}
                >
                    <FormField
                        label="Name"
                        name="authorizedPerson.name"
                        value={
                            formData.authorizedPerson?.name
                        }
                        onChange={handleInputChange}
                    />

                    <FormField
                        label="Phone"
                        name="authorizedPerson.phone"
                        value={
                            formData.authorizedPerson?.phone
                        }
                        onChange={handleInputChange}
                    />

                    <FormField
                        label="Email"
                        name="authorizedPerson.email"
                        value={
                            formData.authorizedPerson?.email
                        }
                        onChange={handleInputChange}
                        type="email"
                    />
                </FormSection>

                {/* ==================================================
                    BANK DETAILS
                ================================================== */}
                <FormSection
                    title="Bank Details"
                    icon={<FiCreditCard />}
                >
                    <FormField
                        label="Account Holder Name"
                        name="bankDetails.accountHolderName"
                        value={
                            formData.bankDetails
                                ?.accountHolderName
                        }
                        onChange={handleInputChange}
                    />

                    <FormField
                        label="Account Number"
                        name="bankDetails.accountNumber"
                        value={
                            formData.bankDetails
                                ?.accountNumber
                        }
                        onChange={handleInputChange}
                    />

                    <FormField
                        label="IFSC Code"
                        name="bankDetails.ifscCode"
                        value={
                            formData.bankDetails
                                ?.ifscCode
                        }
                        onChange={handleInputChange}
                    />

                    <FormField
                        label="Bank Name"
                        name="bankDetails.bankName"
                        value={
                            formData.bankDetails
                                ?.bankName
                        }
                        onChange={handleInputChange}
                    />

                    <FormField
                        label="Branch Name"
                        name="bankDetails.branchName"
                        value={
                            formData.bankDetails
                                ?.branchName
                        }
                        onChange={handleInputChange}
                    />
                </FormSection>

                {/* ==================================================
                    SAVE
                ================================================== */}
                <div className="flex justify-end gap-2 pt-4">

                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isSaving}
                    >
                        <FiSave className="mr-2" />

                        {isSaving
                            ? 'Saving...'
                            : 'Save Changes'}
                    </Button>

                </div>

            </form>
        </div>
    );
};

export default NgoProfilePage;