import React from 'react';
import {Box, Text} from 'ink';
import Spinner from 'ink-spinner';

const LoadingComponent: React.FC = () => {
	return (
		<Box>
			<Text>
				<Text color="white">
					<Spinner type="star" />
				</Text>
				<Text color="white">
					<Spinner type="star" />
				</Text>
				<Text color="white">
					<Spinner type="star" />
				</Text>
			</Text>
		</Box>
	);
};

export default React.memo(LoadingComponent);
