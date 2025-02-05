import { decompress, compress } from "/zstd.js";

export function createShape(image, layer)
{
    const texture =  PIXI.Texture.from(image);

    if (texture.source.viewDimension === "2d") {
        return new PIXI.Sprite({
            texture: texture
        });
    }

    return new PIXI.Sprite2DArray({
        texture: texture,
        layerId: layer,
    });
}

export function calcOrbitAngles(nodesInOrbit)
{
    let orbitAngles = [];

    if (nodesInOrbit == 16) {
        // Every 30 and 45 degrees, per https://github.com/grindinggear/skilltree-export/blob/3.17.0/README.md
        orbitAngles = [ 0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330 ];
    } else if (nodesInOrbit == 40) {
        // Every 10 and 45 degrees
        orbitAngles = [ 0, 10, 20, 30, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 135, 140, 150, 160, 170, 180, 190, 200, 210, 220, 225, 230, 240, 250, 260, 270, 280, 290, 300, 310, 315, 320, 330, 340, 350 ];
    } else {
        // Uniformly spaced
        for (let i = 0; i < nodesInOrbit; i++) {
            orbitAngles.push(360 * i / nodesInOrbit);
        }
    }

    for (let i = 0; i < orbitAngles.length; i++) {
        orbitAngles[i] = orbitAngles[i] * (Math.PI / 180);
    }

    return orbitAngles;
}

export function GetNodeTargetSize(node)
{
    if (node.isAscendancyStart) {
        return {
            overlay: { width: 50, height: 50 },
        }
    } else if (node.type == "Normal" && node.ascendancyName) {
        return {
            overlay: { width: 80, height: 80 },
            width: 37, height: 37
        }
    } else if (node.ascendancyName) {
        return {
            overlay: { width: 100, height: 100 },
            width: 54, height: 54
        }
    } else if (node.type == "Notable") {
        return {
            effect: { width: 380, height: 380 },
            overlay: { width: 80, height: 80 },
            width: 54, height: 54
        }
    } else if (node.type == "AscendClassStart") {
        return {
            effect:  { width: 380, height: 380 },
            overlay: { width: 48 * 0.5, height: 48 * 0.5 },
            width: 32 * 0.5, height: 32 * 0.5
        }
    } else if (node.type == "OnlyImage") {
        return { width: 380, height: 380 }
    } else if (node.type == "Keystone") {
        return {
            effect:  { width: 380, height: 380 },
            overlay: { width: 120, height: 120 },
            width: 82, height: 82
        }
    } else if (node.type == "Normal") {
        return {
            overlay: { width: 54, height: 54 },
            width: 37, height: 37
        }
    } else if (node.type == "Socket") {
        return {
            overlay: {width: 76, height: 76 },
            width: 76, height: 76
        }
    } else if (node.type == "ClassStart") {
        return {
            overlay: { width: 1, height: 1 },
            width: 37, height: 37
        }
    } else {
        return { width: 0, height: 0 };
    }
}

export function calculateColorHex(percentage) {
    // Calculate the value for each RGB channel
    let value = Math.round(255 * (1 - (percentage / 100)));
    
    // Convert to hexadecimal and pad it to 2 digits
    let hexValue = value.toString(16).padStart(2, '0');
    
    // Return the final color in hex format
    return `#${hexValue}${hexValue}${hexValue}`;
}

export async function  loadAndDecompressZstd(url) {
    const response = await fetch(url);
    const compressedData = new Uint8Array(await response.arrayBuffer());
    // Decompress the data
    const decompressedData = decompress(compressedData);
    return decompressedData.buffer;
}

export async function loadTreeJSON(url) {
    const response = await fetch(url);
    return response.json();
}

export function createOrGetTheMask(connector, texture, applyTexture)
{
    // const mask = new PIXI.Graphics();
    // mask.setStrokeStyle({ width: 50, color: 0xFF0000, alpha: 1});
    // mask.arc(connector.x, connector.y, connector.r, connector.a1, connector.a2, false);
    // mask.stroke()

    const radious = connector.r;
    const innerRadious =  radious - 8;
    const outerRadious =  radious + 10;
    const startRad = connector.a2;
    const endRad = connector.a1;
    const x = connector.x;
    const y = connector.y;

    const vertices = [];
    const uvs = [];
    const indices = [];

    // generate arc points
    const uvRotationOffset = -Math.PI; // Shift UVs by -90°
    const segments = 30;
    for (let i = 0; i <= segments; i++) {
        const angle = startRad + (endRad - startRad) * (i / segments);
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        // outer Ring Vertex
        const outerX = x + outerRadious * cosA;
        const outerY = y + outerRadious * sinA;
        vertices.push(outerX, outerY);

        // inner Ring Vertex
        const innerX = x + innerRadious * cosA;
        const innerY = y + innerRadious * sinA;
        vertices.push(innerX, innerY);

        // UVs
        // 🎯 Compute UV mapping for Outer Radius
        const uvX_outer = 1 + cosA;
        const uvY_outer = 1 + sinA;
        uvs.push(uvX_outer, uvY_outer);

        // 🎯 Compute UV mapping for Inner Radius
        const uvX_inner = 1 + ((innerRadious * cosA) / outerRadious);
        const uvY_inner = 1 + (innerRadious * sinA) / outerRadious;
        uvs.push(uvX_inner, uvY_inner);

        // indices
        if (i > 0) {
            const p1 = (i - 1) * 2;
            const p2 = (i - 1) * 2 + 1;
            const p3 = i * 2;
            const p4 = i * 2 + 1;

            indices.push(p1, p2, p3); // First triangle
            indices.push(p2, p4, p3); // Second triangle
        }
    }
    const arcMesh = new PIXI.MeshSimple({
        vertices: vertices,
        uvs: uvs,
        indices: indices,
        texture: applyTexture ? texture : PIXI.Texture.WHITE,
    });

    //arcMesh.anchor.set(1);
    // arcMesh.position.set(connector.x, connector.y);

    return arcMesh;

    //const masktexture = PIXI.RenderTexture.create({ width: connector.r * 2, height: connector.r  * 2 });
    //app.renderer.render({container:mask, target: masktexture});
    
    // const maskSprite = new PIXI.Sprite(masktexture);
    // maskSprite.anchor.set(0.5);
    // maskSprite.position.set(connector.x, connector.y);
    // return mask;
}