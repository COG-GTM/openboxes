import React from 'react';

import { Redirect } from 'react-router-dom';

import { MIGRATION_URL } from 'consts/applicationUrls';

// The legacy /migration/index dashboard opened on the Quality tab.
const MigrationIndex = () => <Redirect to={MIGRATION_URL.dataQuality()} />;

export default MigrationIndex;
