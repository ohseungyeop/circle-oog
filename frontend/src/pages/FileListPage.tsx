import React from 'react';
import FileListGrid from '../components/FileListGrid';

const FileListPage: React.FC = () => {
    return (
        <div>
            <object
                data="https://www.valueonsys.com/logo.html?size=24&amp;option=1&amp;anim=yes&amp;bw=b&amp;t=1738630981328"
                type="text/html"
                width="230"
                height="35"
            ></object>
            <FileListGrid />
        </div>
    );
};

export default FileListPage;
