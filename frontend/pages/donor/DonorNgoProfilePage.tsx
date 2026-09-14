import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    FiArrowLeft,
    FiMail,
    FiPhone,
    FiMapPin,
    FiGlobe,
    FiUsers,
    FiCalendar,
    FiCheckCircle,
    FiLoader,
    FiBriefcase
} from 'react-icons/fi';
import { API_SERVER_URL, apiFetch } from '../../services/api';

interface AuthorizedPerson {
    name?: string;
    phone?: string;
    email?: string;
}

interface NGOProfile {
    _id: string;
    ngoName?: string;
    email?: string;
    contactNumber?: string;
    registrationNumber?: string;
    registeredYear?: number | string;
    address?: string;
    website?: string;
    authorizedPerson?: AuthorizedPerson;
    numberOfEmployees?: number;
    ngoType?: string;
    is80GCertified?: boolean;
    is12ACertified?: boolean;
    logo?: string;
    isActive?: boolean;
}

const DonorNgoProfilePage: React.FC = () => {
    const { ngoId } = useParams<{ ngoId: string }>();

    const [ngo, setNgo] = useState<NGOProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchNgoProfile = async () => {
            if (!ngoId) {
                setError('NGO not found.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError('');

                const response = await apiFetch(`/donor/ngos/${ngoId}`);

                const ngoData =
                    response?.data?.ngo ||
                    response?.ngo ||
                    response?.data;

                if (!ngoData) {
                    throw new Error('NGO profile not found.');
                }

                setNgo(ngoData);
            } catch (err: any) {
                console.error('Failed to fetch NGO profile:', err);

                setError(
                    err?.message ||
                    'Failed to load NGO profile.'
                );
            } finally {
                setLoading(false);
            }
        };

        fetchNgoProfile();
    }, [ngoId]);

    const getAssetUrl = (path?: string) => {
        if (!path) return undefined;

        return path.startsWith('http') || path.startsWith('data:')
            ? path
            : `${API_SERVER_URL}${path.startsWith('/') ? path : `/${path}`}`;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <FiLoader className="animate-spin h-10 w-10 text-blue-600" />
            </div>
        );
    }

    if (error || !ngo) {
        return (
            <div className="max-w-4xl mx-auto text-center py-16">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    NGO Profile Not Found
                </h1>

                <p className="mt-3 text-gray-600 dark:text-gray-400">
                    {error || 'The requested NGO could not be found.'}
                </p>

                <Link
                    to="/donor/ngos"
                    className="inline-flex items-center gap-2 mt-6 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <FiArrowLeft />
                    Back to NGOs
                </Link>
            </div>
        );
    }

    const logoUrl = getAssetUrl(ngo.logo);

    return (
        <div className="max-w-5xl mx-auto space-y-6">

            {/* Back */}
            <Link
                to="/donor/ngos"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
                <FiArrowLeft />
                Back to NGOs
            </Link>

            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">

                <div className="h-56 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">

                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt={ngo.ngoName || 'NGO'}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <FiUsers className="h-24 w-24 text-gray-400" />
                    )}

                </div>

                <div className="p-8">

                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">

                        <div>
                            <div className="flex items-center gap-3">

                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {ngo.ngoName || 'NGO'}
                                </h1>

                                {ngo.isActive && (
                                    <FiCheckCircle
                                        className="text-green-500 h-6 w-6"
                                        title="Active NGO"
                                    />
                                )}

                            </div>

                            {ngo.ngoType && (
                                <p className="mt-2 text-gray-600 dark:text-gray-400">
                                    {ngo.ngoType}
                                </p>
                            )}
                        </div>

                        <Link
                            to={`/donor/campaigns?ngo=${ngo._id}`}
                            className="inline-flex items-center justify-center px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            View Campaigns
                        </Link>

                    </div>

                </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">

                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-5">
                        Contact Information
                    </h2>

                    <div className="space-y-4">

                        {ngo.email && (
                            <div className="flex items-start gap-3">
                                <FiMail className="mt-1 text-blue-600" />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Email
                                    </p>
                                    <a
                                        href={`mailto:${ngo.email}`}
                                        className="text-gray-900 dark:text-white hover:text-blue-600"
                                    >
                                        {ngo.email}
                                    </a>
                                </div>
                            </div>
                        )}

                        {ngo.contactNumber && (
                            <div className="flex items-start gap-3">
                                <FiPhone className="mt-1 text-blue-600" />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Phone
                                    </p>
                                    <a
                                        href={`tel:${ngo.contactNumber}`}
                                        className="text-gray-900 dark:text-white hover:text-blue-600"
                                    >
                                        {ngo.contactNumber}
                                    </a>
                                </div>
                            </div>
                        )}

                        {ngo.address && (
                            <div className="flex items-start gap-3">
                                <FiMapPin className="mt-1 text-blue-600" />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Address
                                    </p>
                                    <p className="text-gray-900 dark:text-white">
                                        {ngo.address}
                                    </p>
                                </div>
                            </div>
                        )}

                        {ngo.website && (
                            <div className="flex items-start gap-3">
                                <FiGlobe className="mt-1 text-blue-600" />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Website
                                    </p>
                                    <a
                                        href={
                                            ngo.website.startsWith('http')
                                                ? ngo.website
                                                : `https://${ngo.website}`
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline break-all"
                                    >
                                        {ngo.website}
                                    </a>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Organization Details */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">

                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-5">
                        Organization Details
                    </h2>

                    <div className="space-y-4">

                        {ngo.registrationNumber && (
                            <div className="flex items-start gap-3">
                                <FiBriefcase className="mt-1 text-blue-600" />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Registration Number
                                    </p>
                                    <p className="text-gray-900 dark:text-white">
                                        {ngo.registrationNumber}
                                    </p>
                                </div>
                            </div>
                        )}

                        {ngo.registeredYear && (
                            <div className="flex items-start gap-3">
                                <FiCalendar className="mt-1 text-blue-600" />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Registered Year
                                    </p>
                                    <p className="text-gray-900 dark:text-white">
                                        {ngo.registeredYear}
                                    </p>
                                </div>
                            </div>
                        )}

                        {ngo.numberOfEmployees !== undefined &&
                            ngo.numberOfEmployees !== null && (
                                <div className="flex items-start gap-3">
                                    <FiUsers className="mt-1 text-blue-600" />
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Number of Employees
                                        </p>
                                        <p className="text-gray-900 dark:text-white">
                                            {ngo.numberOfEmployees}
                                        </p>
                                    </div>
                                </div>
                            )}

                        {ngo.ngoType && (
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    NGO Type
                                </p>
                                <p className="text-gray-900 dark:text-white mt-1">
                                    {ngo.ngoType}
                                </p>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Certifications */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">

                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-5">
                    Certifications
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                        <FiCheckCircle
                            className={
                                ngo.is80GCertified
                                    ? 'text-green-500'
                                    : 'text-gray-400'
                            }
                        />

                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                                80G Certification
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {ngo.is80GCertified
                                    ? 'Certified'
                                    : 'Not certified'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                        <FiCheckCircle
                            className={
                                ngo.is12ACertified
                                    ? 'text-green-500'
                                    : 'text-gray-400'
                            }
                        />

                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                                12A Certification
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {ngo.is12ACertified
                                    ? 'Certified'
                                    : 'Not certified'}
                            </p>
                        </div>
                    </div>

                </div>
            </div>

            {/* Authorized Person */}
            {ngo.authorizedPerson && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">

                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-5">
                        Authorized Representative
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {ngo.authorizedPerson.name && (
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Name
                                </p>
                                <p className="mt-1 text-gray-900 dark:text-white">
                                    {ngo.authorizedPerson.name}
                                </p>
                            </div>
                        )}

                        {ngo.authorizedPerson.email && (
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Email
                                </p>
                                <p className="mt-1 text-gray-900 dark:text-white break-all">
                                    {ngo.authorizedPerson.email}
                                </p>
                            </div>
                        )}

                        {ngo.authorizedPerson.phone && (
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Phone
                                </p>
                                <p className="mt-1 text-gray-900 dark:text-white">
                                    {ngo.authorizedPerson.phone}
                                </p>
                            </div>
                        )}

                    </div>
                </div>
            )}

        </div>
    );
};

export default DonorNgoProfilePage;