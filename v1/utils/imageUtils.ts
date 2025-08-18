export const getNewFileName = (originalFilename: string): string => {
    const filenameWithoutExt = originalFilename.split('.').slice(0, -1).join('.');
    const ext = originalFilename.split('.').pop();
    return `${filenameWithoutExt}-${getTimestamp()}.${ext}`;
}

export const getTimestamp = (): string => {
    const dt = new Date();

    return `${
        (dt.getMonth()+1).toString().padStart(2, '0')}${
        dt.getDate().toString().padStart(2, '0')}${
        dt.getFullYear().toString().padStart(4, '0')}${
        dt.getHours().toString().padStart(2, '0')}${
        dt.getMinutes().toString().padStart(2, '0')}${
        dt.getSeconds().toString().padStart(2, '0')}`
}
